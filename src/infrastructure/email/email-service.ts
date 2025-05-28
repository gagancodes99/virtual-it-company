import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import { createTransport } from 'nodemailer';

export interface EmailConfig {
  provider: 'sendgrid' | 'smtp' | 'mock';
  sendgrid?: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
  };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
    fromEmail: string;
    fromName: string;
  };
}

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  type?: string;
  disposition?: 'attachment' | 'inline';
  contentId?: string;
}

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables?: Record<string, string>;
}

export interface EmailMessage {
  to: EmailAddress | EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  htmlContent?: string;
  textContent?: string;
  template?: string;
  templateVariables?: Record<string, any>;
  attachments?: EmailAttachment[];
  priority?: 'high' | 'normal' | 'low';
  tags?: string[];
  customHeaders?: Record<string, string>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
  timestamp: Date;
}

export abstract class BaseEmailService {
  protected config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  abstract sendEmail(message: EmailMessage): Promise<EmailResult>;
  abstract sendTemplate(templateId: string, to: EmailAddress[], variables: Record<string, any>): Promise<EmailResult>;
  abstract testConnection(): Promise<boolean>;
}

export class SendGridEmailService extends BaseEmailService {
  constructor(config: EmailConfig) {
    super(config);
    
    if (!config.sendgrid?.apiKey) {
      throw new Error('SendGrid API key is required');
    }
    
    sgMail.setApiKey(config.sendgrid.apiKey);
  }

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    try {
      const sendgridMessage = this.convertToSendGridFormat(message);
      const [response] = await sgMail.send(sendgridMessage);

      return {
        success: true,
        messageId: response.headers['x-message-id'] as string,
        provider: 'sendgrid',
        timestamp: new Date(),
      };
    } catch {
      console.error('SendGrid email error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
        provider: 'sendgrid',
        timestamp: new Date(),
      };
    }
  }

  async sendTemplate(templateId: string, to: EmailAddress[], variables: Record<string, any>): Promise<EmailResult> {
    try {
      const message = {
        to: to.map(addr => ({ email: addr.email, name: addr.name })),
        from: {
          email: this.config.sendgrid!.fromEmail,
          name: this.config.sendgrid!.fromName,
        },
        templateId,
        dynamicTemplateData: variables,
      };

      const [response] = await sgMail.send(message as any);

      return {
        success: true,
        messageId: response.headers['x-message-id'] as string,
        provider: 'sendgrid',
        timestamp: new Date(),
      };
    } catch {
      console.error('SendGrid template email error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send template email',
        provider: 'sendgrid',
        timestamp: new Date(),
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // SendGrid doesn't have a dedicated test endpoint, so we'll just validate the API key format
      return this.config.sendgrid?.apiKey?.startsWith('SG.') || false;
    } catch {
      return false;
    }
  }

  private convertToSendGridFormat(message: EmailMessage): any {
    const to = Array.isArray(message.to) ? message.to : [message.to];
    
    return {
      to: to.map(addr => ({ email: addr.email, name: addr.name })),
      cc: message.cc?.map(addr => ({ email: addr.email, name: addr.name })),
      bcc: message.bcc?.map(addr => ({ email: addr.email, name: addr.name })),
      from: {
        email: this.config.sendgrid!.fromEmail,
        name: this.config.sendgrid!.fromName,
      },
      subject: message.subject,
      html: message.htmlContent,
      text: message.textContent,
      attachments: message.attachments?.map(att => ({
        filename: att.filename,
        content: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
        type: att.type,
        disposition: att.disposition,
        content_id: att.contentId,
      })),
      headers: message.customHeaders,
      categories: message.tags,
    };
  }
}

export class SMTPEmailService extends BaseEmailService {
  private transporter: nodemailer.Transporter;

  constructor(config: EmailConfig) {
    super(config);
    
    if (!config.smtp) {
      throw new Error('SMTP configuration is required');
    }

    this.transporter = createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.auth,
    });
  }

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    try {
      const nodemailerMessage = this.convertToNodemailerFormat(message);
      const result = await this.transporter.sendMail(nodemailerMessage);

      return {
        success: true,
        messageId: result.messageId,
        provider: 'smtp',
        timestamp: new Date(),
      };
    } catch {
      console.error('SMTP email error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
        provider: 'smtp',
        timestamp: new Date(),
      };
    }
  }

  async sendTemplate(templateId: string, to: EmailAddress[], variables: Record<string, any>): Promise<EmailResult> {
    // For SMTP, we would need to load the template from a template engine
    // This is a simplified implementation
    return {
      success: false,
      error: 'Template emails not implemented for SMTP provider',
      provider: 'smtp',
      timestamp: new Date(),
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  private convertToNodemailerFormat(message: EmailMessage): any {
    const to = Array.isArray(message.to) ? message.to : [message.to];
    
    return {
      from: `${this.config.smtp!.fromName} <${this.config.smtp!.fromEmail}>`,
      to: to.map(addr => addr.name ? `${addr.name} <${addr.email}>` : addr.email).join(', '),
      cc: message.cc?.map(addr => addr.name ? `${addr.name} <${addr.email}>` : addr.email).join(', '),
      bcc: message.bcc?.map(addr => addr.name ? `${addr.name} <${addr.email}>` : addr.email).join(', '),
      subject: message.subject,
      html: message.htmlContent,
      text: message.textContent,
      attachments: message.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.type,
        cid: att.contentId,
      })),
      headers: message.customHeaders,
      priority: message.priority,
    };
  }
}

export class MockEmailService extends BaseEmailService {
  private sentEmails: (EmailMessage & { timestamp: Date; messageId: string })[] = [];

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    const messageId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.sentEmails.push({
      ...message,
      timestamp: new Date(),
      messageId,
    });

    console.log('Mock email sent:', {
      to: message.to,
      subject: message.subject,
      messageId,
    });

    return {
      success: true,
      messageId,
      provider: 'mock',
      timestamp: new Date(),
    };
  }

  async sendTemplate(templateId: string, to: EmailAddress[], variables: Record<string, any>): Promise<EmailResult> {
    return this.sendEmail({
      to,
      subject: `Template: ${templateId}`,
      htmlContent: `Mock template email with variables: ${JSON.stringify(variables)}`,
    });
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  getSentEmails(): (EmailMessage & { timestamp: Date; messageId: string })[] {
    return [...this.sentEmails];
  }

  clearSentEmails(): void {
    this.sentEmails = [];
  }
}

export class EmailTemplateEngine {
  private templates: Map<string, EmailTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    // Welcome email template
    this.templates.set('welcome', {
      subject: 'Welcome to {{COMPANY_NAME}}!',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to {{COMPANY_NAME}}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
            .footer { padding: 20px; text-align: center; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to {{COMPANY_NAME}}!</h1>
            </div>
            <div class="content">
              <h2>Hello {{USER_NAME}},</h2>
              <p>Thank you for joining {{COMPANY_NAME}}! We're excited to have you as part of our community.</p>
              <p>Your account has been successfully created and you can now access all the features of our platform.</p>
              <p style="text-align: center;">
                <a href="{{DASHBOARD_URL}}" class="button">Go to Dashboard</a>
              </p>
              <p>If you have any questions, please don't hesitate to contact our support team.</p>
              <p>Best regards,<br>The {{COMPANY_NAME}} Team</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 {{COMPANY_NAME}}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textContent: `
        Welcome to {{COMPANY_NAME}}!
        
        Hello {{USER_NAME}},
        
        Thank you for joining {{COMPANY_NAME}}! We're excited to have you as part of our community.
        
        Your account has been successfully created and you can now access all the features of our platform.
        
        Visit your dashboard: {{DASHBOARD_URL}}
        
        If you have any questions, please don't hesitate to contact our support team.
        
        Best regards,
        The {{COMPANY_NAME}} Team
      `,
    });

    // Project notification template
    this.templates.set('project-notification', {
      subject: 'Project Update: {{PROJECT_NAME}}',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Project Update</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #28a745; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
            .status.success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
            .status.warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
            .status.error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
            .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Project Update</h1>
            </div>
            <div class="content">
              <h2>{{PROJECT_NAME}}</h2>
              <div class="status {{STATUS_CLASS}}">
                <strong>Status:</strong> {{PROJECT_STATUS}}
              </div>
              <p><strong>Update:</strong> {{UPDATE_MESSAGE}}</p>
              {{#if AGENT_NAME}}
              <p><strong>Agent:</strong> {{AGENT_NAME}}</p>
              {{/if}}
              {{#if PROGRESS}}
              <p><strong>Progress:</strong> {{PROGRESS}}% complete</p>
              {{/if}}
              <p style="text-align: center;">
                <a href="{{PROJECT_URL}}" class="button">View Project</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    // Task assignment template
    this.templates.set('task-assignment', {
      subject: 'New Task Assigned: {{TASK_TITLE}}',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Task Assignment</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #17a2b8; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .task-details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #17a2b8; }
            .priority { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .priority.high { background: #dc3545; color: white; }
            .priority.medium { background: #ffc107; color: black; }
            .priority.low { background: #28a745; color: white; }
            .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Task Assignment</h1>
            </div>
            <div class="content">
              <p>Hello {{ASSIGNEE_NAME}},</p>
              <p>You have been assigned a new task in project <strong>{{PROJECT_NAME}}</strong>.</p>
              
              <div class="task-details">
                <h3>{{TASK_TITLE}} <span class="priority {{PRIORITY_CLASS}}">{{PRIORITY}}</span></h3>
                <p><strong>Description:</strong> {{TASK_DESCRIPTION}}</p>
                <p><strong>Due Date:</strong> {{DUE_DATE}}</p>
                {{#if REQUIREMENTS}}
                <p><strong>Requirements:</strong></p>
                <ul>
                  {{#each REQUIREMENTS}}
                  <li>{{this}}</li>
                  {{/each}}
                </ul>
                {{/if}}
              </div>
              
              <p style="text-align: center;">
                <a href="{{TASK_URL}}" class="button">View Task</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  }

  getTemplate(templateId: string): EmailTemplate | undefined {
    return this.templates.get(templateId);
  }

  addTemplate(templateId: string, template: EmailTemplate): void {
    this.templates.set(templateId, template);
  }

  renderTemplate(templateId: string, variables: Record<string, any>): EmailTemplate | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    return {
      subject: this.replaceVariables(template.subject, variables),
      htmlContent: this.replaceVariables(template.htmlContent, variables),
      textContent: template.textContent ? this.replaceVariables(template.textContent, variables) : undefined,
    };
  }

  private replaceVariables(content: string, variables: Record<string, any>): string {
    let result = content;
    
    // Replace {{VARIABLE}} patterns
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }
    
    // Handle conditional blocks {{#if VARIABLE}}...{{/if}}
    result = result.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, variable, content) => {
      return variables[variable] ? content : '';
    });
    
    // Handle loops {{#each ARRAY}}...{{/each}}
    result = result.replace(/{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g, (match, variable, content) => {
      const array = variables[variable];
      if (!Array.isArray(array)) return '';
      
      return array.map(item => {
        return content.replace(/{{this}}/g, String(item));
      }).join('');
    });
    
    return result;
  }
}

export class EmailNotificationService {
  private emailService: BaseEmailService;
  private templateEngine: EmailTemplateEngine;

  constructor(config: EmailConfig) {
    this.templateEngine = new EmailTemplateEngine();
    
    switch (config.provider) {
      case 'sendgrid':
        this.emailService = new SendGridEmailService(config);
        break;
      case 'smtp':
        this.emailService = new SMTPEmailService(config);
        break;
      case 'mock':
        this.emailService = new MockEmailService(config);
        break;
      default:
        throw new Error(`Unsupported email provider: ${config.provider}`);
    }
  }

  async sendWelcomeEmail(user: { name: string; email: string }, companyName: string, dashboardUrl: string): Promise<EmailResult> {
    const template = this.templateEngine.renderTemplate('welcome', {
      USER_NAME: user.name,
      COMPANY_NAME: companyName,
      DASHBOARD_URL: dashboardUrl,
    });

    if (!template) {
      throw new Error('Welcome email template not found');
    }

    return this.emailService.sendEmail({
      to: { email: user.email, name: user.name },
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
    });
  }

  async sendProjectNotification(
    user: { name: string; email: string },
    project: { name: string; status: string; url: string },
    update: { message: string; agentName?: string; progress?: number }
  ): Promise<EmailResult> {
    const statusClass = project.status === 'completed' ? 'success' :
                      project.status === 'failed' ? 'error' : 'warning';

    const template = this.templateEngine.renderTemplate('project-notification', {
      PROJECT_NAME: project.name,
      PROJECT_STATUS: project.status,
      PROJECT_URL: project.url,
      STATUS_CLASS: statusClass,
      UPDATE_MESSAGE: update.message,
      AGENT_NAME: update.agentName,
      PROGRESS: update.progress,
    });

    if (!template) {
      throw new Error('Project notification template not found');
    }

    return this.emailService.sendEmail({
      to: { email: user.email, name: user.name },
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
    });
  }

  async sendTaskAssignmentEmail(
    assignee: { name: string; email: string },
    task: { title: string; description: string; priority: string; dueDate: string; url: string; requirements?: string[] },
    project: { name: string }
  ): Promise<EmailResult> {
    const priorityClass = task.priority.toLowerCase();
    
    const template = this.templateEngine.renderTemplate('task-assignment', {
      ASSIGNEE_NAME: assignee.name,
      PROJECT_NAME: project.name,
      TASK_TITLE: task.title,
      TASK_DESCRIPTION: task.description,
      TASK_URL: task.url,
      PRIORITY: task.priority.toUpperCase(),
      PRIORITY_CLASS: priorityClass,
      DUE_DATE: task.dueDate,
      REQUIREMENTS: task.requirements,
    });

    if (!template) {
      throw new Error('Task assignment template not found');
    }

    return this.emailService.sendEmail({
      to: { email: assignee.email, name: assignee.name },
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
      priority: task.priority === 'high' ? 'high' : 'normal',
    });
  }

  async sendCustomEmail(message: EmailMessage): Promise<EmailResult> {
    return this.emailService.sendEmail(message);
  }

  async testConnection(): Promise<boolean> {
    return this.emailService.testConnection();
  }

  addCustomTemplate(templateId: string, template: EmailTemplate): void {
    this.templateEngine.addTemplate(templateId, template);
  }

  // For debugging with mock service
  getSentEmails(): any[] {
    if (this.emailService instanceof MockEmailService) {
      return this.emailService.getSentEmails();
    }
    return [];
  }
}

// Factory function
export function createEmailService(config?: Partial<EmailConfig>): EmailNotificationService {
  const defaultConfig: EmailConfig = {
    provider: (process.env.EMAIL_PROVIDER as any) || 'mock',
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY || '',
      fromEmail: process.env.EMAIL_FROM || 'noreply@example.com',
      fromName: process.env.EMAIL_FROM_NAME || 'Virtual IT Company',
    },
    smtp: {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
      fromEmail: process.env.EMAIL_FROM || 'noreply@example.com',
      fromName: process.env.EMAIL_FROM_NAME || 'Virtual IT Company',
    },
  };

  const finalConfig = { ...defaultConfig, ...config };
  return new EmailNotificationService(finalConfig);
}