import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

export interface StorageConfig {
  provider: 'aws-s3' | 'local' | 'mock';
  aws?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    endpoint?: string;
  };
  local?: {
    uploadDir: string;
    baseUrl: string;
  };
}

export interface FileMetadata {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  hash: string;
  uploadedAt: Date;
  uploadedBy?: string;
  tenantId?: string;
  projectId?: string;
  metadata?: Record<string, any>;
}

export interface UploadOptions {
  filename?: string;
  contentType?: string;
  metadata?: Record<string, any>;
  tenantId?: string;
  projectId?: string;
  uploadedBy?: string;
  isPublic?: boolean;
  expiresIn?: number; // seconds
}

export interface DownloadOptions {
  expiresIn?: number; // seconds for signed URLs
  inline?: boolean; // Content-Disposition
}

export interface ListOptions {
  prefix?: string;
  tenantId?: string;
  projectId?: string;
  limit?: number;
  offset?: number;
}

export abstract class BaseStorageService {
  protected config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
  }

  abstract uploadFile(buffer: Buffer, options: UploadOptions): Promise<FileMetadata>;
  abstract downloadFile(fileId: string, options?: DownloadOptions): Promise<{ buffer: Buffer; metadata: FileMetadata }>;
  abstract getFileUrl(fileId: string, options?: DownloadOptions): Promise<string>;
  abstract deleteFile(fileId: string): Promise<void>;
  abstract listFiles(options?: ListOptions): Promise<FileMetadata[]>;
  abstract getFileMetadata(fileId: string): Promise<FileMetadata>;
  abstract testConnection(): Promise<boolean>;
}

export class S3StorageService extends BaseStorageService {
  private s3Client: S3Client;
  private bucket: string;

  constructor(config: StorageConfig) {
    super(config);
    
    if (!config.aws) {
      throw new Error('AWS S3 configuration is required');
    }

    this.bucket = config.aws.bucket;
    this.s3Client = new S3Client({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
      endpoint: config.aws.endpoint,
    });
  }

  async uploadFile(buffer: Buffer, options: UploadOptions): Promise<FileMetadata> {
    const fileId = this.generateFileId();
    const hash = this.calculateHash(buffer);
    const extension = this.getFileExtension(options.filename || '');
    const key = this.buildS3Key(fileId, extension, options);

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: options.contentType || 'application/octet-stream',
        Metadata: {
          originalName: options.filename || 'unknown',
          hash,
          uploadedBy: options.uploadedBy || 'unknown',
          tenantId: options.tenantId || '',
          projectId: options.projectId || '',
          ...options.metadata,
        },
        ACL: options.isPublic ? 'public-read' : 'private',
      });

      await this.s3Client.send(command);

      const metadata: FileMetadata = {
        id: fileId,
        filename: `${fileId}${extension}`,
        originalName: options.filename || 'unknown',
        mimeType: options.contentType || 'application/octet-stream',
        size: buffer.length,
        path: key,
        url: await this.getFileUrl(fileId),
        hash,
        uploadedAt: new Date(),
        uploadedBy: options.uploadedBy,
        tenantId: options.tenantId,
        projectId: options.projectId,
        metadata: options.metadata,
      };

      return metadata;
    } catch {
      console.error('S3 upload error:', error);
      throw new Error(`Failed to upload file: ${error}`);
    }
  }

  async downloadFile(fileId: string, options?: DownloadOptions): Promise<{ buffer: Buffer; metadata: FileMetadata }> {
    const key = await this.findFileKey(fileId);
    
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('No file content received');
      }

      const buffer = Buffer.from(await response.Body.transformToByteArray());
      
      const metadata: FileMetadata = {
        id: fileId,
        filename: path.basename(key),
        originalName: response.Metadata?.originalname || path.basename(key),
        mimeType: response.ContentType || 'application/octet-stream',
        size: response.ContentLength || buffer.length,
        path: key,
        url: await this.getFileUrl(fileId, options),
        hash: response.Metadata?.hash || '',
        uploadedAt: response.LastModified || new Date(),
        uploadedBy: response.Metadata?.uploadedby,
        tenantId: response.Metadata?.tenantid,
        projectId: response.Metadata?.projectid,
      };

      return { buffer, metadata };
    } catch {
      console.error('S3 download error:', error);
      throw new Error(`Failed to download file: ${error}`);
    }
  }

  async getFileUrl(fileId: string, options?: DownloadOptions): Promise<string> {
    const key = await this.findFileKey(fileId);
    
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: options?.inline ? 'inline' : 'attachment',
      });

      const expiresIn = options?.expiresIn || 3600; // 1 hour default
      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch {
      console.error('S3 URL generation error:', error);
      throw new Error(`Failed to generate file URL: ${error}`);
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    const key = await this.findFileKey(fileId);
    
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch {
      console.error('S3 delete error:', error);
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  async listFiles(options?: ListOptions): Promise<FileMetadata[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: options?.prefix,
        MaxKeys: options?.limit || 100,
      });

      const response = await this.s3Client.send(command);
      const files: FileMetadata[] = [];

      if (response.Contents) {
        for (const object of response.Contents) {
          if (!object.Key) continue;

          // Get metadata for each file
          try {
            const fileId = this.extractFileIdFromKey(object.Key);
            const metadata = await this.getFileMetadata(fileId);
            files.push(metadata);
          } catch {
            console.warn(`Failed to get metadata for ${object.Key}:`, error);
          }
        }
      }

      return files;
    } catch {
      console.error('S3 list error:', error);
      throw new Error(`Failed to list files: ${error}`);
    }
  }

  async getFileMetadata(fileId: string): Promise<FileMetadata> {
    const { metadata } = await this.downloadFile(fileId);
    return metadata;
  }

  async testConnection(): Promise<boolean> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        MaxKeys: 1,
      });
      
      await this.s3Client.send(command);
      return true;
    } catch {
      console.error('S3 connection test failed:', error);
      return false;
    }
  }

  private async findFileKey(fileId: string): Promise<string> {
    // First try common extensions
    const extensions = ['', '.jpg', '.png', '.pdf', '.txt', '.json', '.zip'];
    
    for (const ext of extensions) {
      const key = this.buildS3Key(fileId, ext);
      try {
        const command = new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        });
        
        await this.s3Client.send(command);
        return key;
      } catch {
        // Continue to next extension
      }
    }
    
    throw new Error(`File not found: ${fileId}`);
  }

  private buildS3Key(fileId: string, extension: string = '', options?: UploadOptions): string {
    const parts = [fileId];
    
    if (options?.tenantId) {
      parts.unshift(`tenants/${options.tenantId}`);
    }
    
    if (options?.projectId) {
      parts.push(`projects/${options.projectId}`);
    }
    
    return `${parts.join('/')}${extension}`;
  }

  private extractFileIdFromKey(key: string): string {
    const parts = key.split('/');
    const filename = parts[parts.length - 1];
    return filename.split('.')[0];
  }

  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
  }

  private calculateHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }
}

export class LocalStorageService extends BaseStorageService {
  private uploadDir: string;
  private baseUrl: string;
  private metadata: Map<string, FileMetadata> = new Map();

  constructor(config: StorageConfig) {
    super(config);
    
    if (!config.local) {
      throw new Error('Local storage configuration is required');
    }

    this.uploadDir = config.local.uploadDir;
    this.baseUrl = config.local.baseUrl;
    
    // Ensure upload directory exists
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch {
      console.error('Failed to create upload directory:', error);
    }
  }

  async uploadFile(buffer: Buffer, options: UploadOptions): Promise<FileMetadata> {
    const fileId = this.generateFileId();
    const hash = this.calculateHash(buffer);
    const extension = this.getFileExtension(options.filename || '');
    const filename = `${fileId}${extension}`;
    const filePath = path.join(this.uploadDir, filename);

    try {
      await fs.writeFile(filePath, buffer);

      const metadata: FileMetadata = {
        id: fileId,
        filename,
        originalName: options.filename || 'unknown',
        mimeType: options.contentType || 'application/octet-stream',
        size: buffer.length,
        path: filePath,
        url: `${this.baseUrl}/${filename}`,
        hash,
        uploadedAt: new Date(),
        uploadedBy: options.uploadedBy,
        tenantId: options.tenantId,
        projectId: options.projectId,
        metadata: options.metadata,
      };

      this.metadata.set(fileId, metadata);
      await this.saveMetadata();

      return metadata;
    } catch {
      console.error('Local storage upload error:', error);
      throw new Error(`Failed to upload file: ${error}`);
    }
  }

  async downloadFile(fileId: string, options?: DownloadOptions): Promise<{ buffer: Buffer; metadata: FileMetadata }> {
    const metadata = this.metadata.get(fileId);
    if (!metadata) {
      throw new Error(`File not found: ${fileId}`);
    }

    try {
      const buffer = await fs.readFile(metadata.path);
      return { buffer, metadata };
    } catch {
      console.error('Local storage download error:', error);
      throw new Error(`Failed to download file: ${error}`);
    }
  }

  async getFileUrl(fileId: string, options?: DownloadOptions): Promise<string> {
    const metadata = this.metadata.get(fileId);
    if (!metadata) {
      throw new Error(`File not found: ${fileId}`);
    }

    return metadata.url;
  }

  async deleteFile(fileId: string): Promise<void> {
    const metadata = this.metadata.get(fileId);
    if (!metadata) {
      throw new Error(`File not found: ${fileId}`);
    }

    try {
      await fs.unlink(metadata.path);
      this.metadata.delete(fileId);
      await this.saveMetadata();
    } catch {
      console.error('Local storage delete error:', error);
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  async listFiles(options?: ListOptions): Promise<FileMetadata[]> {
    let files = Array.from(this.metadata.values());

    if (options?.tenantId) {
      files = files.filter(f => f.tenantId === options.tenantId);
    }

    if (options?.projectId) {
      files = files.filter(f => f.projectId === options.projectId);
    }

    if (options?.prefix) {
      files = files.filter(f => f.filename.startsWith(options.prefix!));
    }

    const start = options?.offset || 0;
    const limit = options?.limit || 100;
    return files.slice(start, start + limit);
  }

  async getFileMetadata(fileId: string): Promise<FileMetadata> {
    const metadata = this.metadata.get(fileId);
    if (!metadata) {
      throw new Error(`File not found: ${fileId}`);
    }
    return metadata;
  }

  async testConnection(): Promise<boolean> {
    try {
      await fs.access(this.uploadDir);
      return true;
    } catch {
      return false;
    }
  }

  private async saveMetadata(): Promise<void> {
    const metadataFile = path.join(this.uploadDir, '.metadata.json');
    const data = JSON.stringify(Array.from(this.metadata.entries()), null, 2);
    
    try {
      await fs.writeFile(metadataFile, data);
    } catch {
      console.error('Failed to save metadata:', error);
    }
  }

  private async loadMetadata(): Promise<void> {
    const metadataFile = path.join(this.uploadDir, '.metadata.json');
    
    try {
      const data = await fs.readFile(metadataFile, 'utf8');
      const entries = JSON.parse(data);
      this.metadata = new Map(entries);
    } catch {
      // Metadata file doesn't exist or is corrupted, start fresh
      this.metadata = new Map();
    }
  }

  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
  }

  private calculateHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }
}

export class MockStorageService extends BaseStorageService {
  private files: Map<string, { buffer: Buffer; metadata: FileMetadata }> = new Map();

  async uploadFile(buffer: Buffer, options: UploadOptions): Promise<FileMetadata> {
    const fileId = this.generateFileId();
    const hash = this.calculateHash(buffer);
    const extension = this.getFileExtension(options.filename || '');
    const filename = `${fileId}${extension}`;

    const metadata: FileMetadata = {
      id: fileId,
      filename,
      originalName: options.filename || 'unknown',
      mimeType: options.contentType || 'application/octet-stream',
      size: buffer.length,
      path: `/mock/${filename}`,
      url: `http://localhost:3000/files/${fileId}`,
      hash,
      uploadedAt: new Date(),
      uploadedBy: options.uploadedBy,
      tenantId: options.tenantId,
      projectId: options.projectId,
      metadata: options.metadata,
    };

    this.files.set(fileId, { buffer, metadata });

    console.log('Mock file uploaded:', {
      id: fileId,
      filename: metadata.originalName,
      size: metadata.size,
    });

    return metadata;
  }

  async downloadFile(fileId: string, options?: DownloadOptions): Promise<{ buffer: Buffer; metadata: FileMetadata }> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    return file;
  }

  async getFileUrl(fileId: string, options?: DownloadOptions): Promise<string> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    return file.metadata.url;
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.files.has(fileId)) {
      throw new Error(`File not found: ${fileId}`);
    }

    this.files.delete(fileId);
    console.log('Mock file deleted:', fileId);
  }

  async listFiles(options?: ListOptions): Promise<FileMetadata[]> {
    let files = Array.from(this.files.values()).map(f => f.metadata);

    if (options?.tenantId) {
      files = files.filter(f => f.tenantId === options.tenantId);
    }

    if (options?.projectId) {
      files = files.filter(f => f.projectId === options.projectId);
    }

    if (options?.prefix) {
      files = files.filter(f => f.filename.startsWith(options.prefix!));
    }

    const start = options?.offset || 0;
    const limit = options?.limit || 100;
    return files.slice(start, start + limit);
  }

  async getFileMetadata(fileId: string): Promise<FileMetadata> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    return file.metadata;
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  // Mock-specific methods
  getUploadedFiles(): FileMetadata[] {
    return Array.from(this.files.values()).map(f => f.metadata);
  }

  clearFiles(): void {
    this.files.clear();
  }

  private generateFileId(): string {
    return `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
  }

  private calculateHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }
}

export class FileUploadService {
  private storageService: BaseStorageService;

  constructor(config: StorageConfig) {
    switch (config.provider) {
      case 'aws-s3':
        this.storageService = new S3StorageService(config);
        break;
      case 'local':
        this.storageService = new LocalStorageService(config);
        break;
      case 'mock':
        this.storageService = new MockStorageService(config);
        break;
      default:
        throw new Error(`Unsupported storage provider: ${config.provider}`);
    }
  }

  async uploadProjectFile(
    buffer: Buffer,
    filename: string,
    projectId: string,
    tenantId: string,
    uploadedBy: string,
    contentType?: string
  ): Promise<FileMetadata> {
    return this.storageService.uploadFile(buffer, {
      filename,
      contentType,
      projectId,
      tenantId,
      uploadedBy,
      metadata: {
        category: 'project',
        uploadedAt: new Date().toISOString(),
      },
    });
  }

  async uploadArtifact(
    buffer: Buffer,
    filename: string,
    taskId: string,
    agentId: string,
    projectId: string,
    tenantId: string,
    contentType?: string
  ): Promise<FileMetadata> {
    return this.storageService.uploadFile(buffer, {
      filename,
      contentType,
      projectId,
      tenantId,
      uploadedBy: agentId,
      metadata: {
        category: 'artifact',
        taskId,
        agentId,
        generatedAt: new Date().toISOString(),
      },
    });
  }

  async uploadAvatar(
    buffer: Buffer,
    filename: string,
    userId: string,
    tenantId: string,
    contentType?: string
  ): Promise<FileMetadata> {
    return this.storageService.uploadFile(buffer, {
      filename,
      contentType,
      tenantId,
      uploadedBy: userId,
      isPublic: true,
      metadata: {
        category: 'avatar',
        userId,
      },
    });
  }

  async getProjectFiles(projectId: string, tenantId: string): Promise<FileMetadata[]> {
    return this.storageService.listFiles({
      projectId,
      tenantId,
    });
  }

  async getTaskArtifacts(taskId: string): Promise<FileMetadata[]> {
    const files = await this.storageService.listFiles();
    return files.filter(f => f.metadata?.taskId === taskId);
  }

  async downloadFile(fileId: string): Promise<{ buffer: Buffer; metadata: FileMetadata }> {
    return this.storageService.downloadFile(fileId);
  }

  async getFileUrl(fileId: string, expiresIn: number = 3600): Promise<string> {
    return this.storageService.getFileUrl(fileId, { expiresIn });
  }

  async deleteFile(fileId: string): Promise<void> {
    return this.storageService.deleteFile(fileId);
  }

  async getFileMetadata(fileId: string): Promise<FileMetadata> {
    return this.storageService.getFileMetadata(fileId);
  }

  async testConnection(): Promise<boolean> {
    return this.storageService.testConnection();
  }

  // File validation utilities
  static validateFileType(filename: string, allowedTypes: string[]): boolean {
    const extension = filename.toLowerCase().split('.').pop() || '';
    return allowedTypes.includes(extension);
  }

  static validateFileSize(buffer: Buffer, maxSizeBytes: number): boolean {
    return buffer.length <= maxSizeBytes;
  }

  static getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
    if (mimeType.includes('text') || mimeType.includes('json')) return '📝';
    return '📁';
  }
}

// Factory function
export function createFileStorageService(config?: Partial<StorageConfig>): FileUploadService {
  const defaultConfig: StorageConfig = {
    provider: (process.env.STORAGE_PROVIDER as any) || 'local',
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      bucket: process.env.AWS_BUCKET_NAME || 'virtual-it-company',
    },
    local: {
      uploadDir: process.env.UPLOAD_DIR || './uploads',
      baseUrl: process.env.FILES_BASE_URL || 'http://localhost:3000/files',
    },
  };

  const finalConfig = { ...defaultConfig, ...config };
  return new FileUploadService(finalConfig);
}