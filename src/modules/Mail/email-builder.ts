export interface BuiltEmail {
  subject: string;
  html: string;
}

export class EmailBuilder {
  private emailSubject = '';
  private blocks: string[] = [];

  subject(subject: string): this {
    this.emailSubject = subject;
    return this;
  }

  heading(text: string): this {
    this.blocks.push(
      `<h1 style="margin:0 0 16px;font-size:20px;color:#111827;">${text}</h1>`,
    );
    return this;
  }

  paragraph(text: string): this {
    this.blocks.push(
      `<p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#374151;">${text}</p>`,
    );
    return this;
  }

  button(label: string, url: string): this {
    this.blocks.push(
      `<a href="${url}" style="display:inline-block;margin:8px 0 16px;padding:10px 20px;background-color:#4f46e5;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">${label}</a>`,
    );
    return this;
  }

  build(): BuiltEmail {
    const html = `
      <div style="font-family:Arial, sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <div style="margin-bottom:24px;font-size:14px;font-weight:700;color:#4f46e5;">Guniverse</div>
        ${this.blocks.join('\n')}
        <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Este es un mensaje automático, no respondas a este correo.</p>
      </div>
    `.trim();

    return { subject: this.emailSubject, html };
  }
}
