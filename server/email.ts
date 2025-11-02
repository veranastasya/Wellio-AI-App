import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email};
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableResendClient() {
  const credentials = await getCredentials();
  return {
    client: new Resend(credentials.apiKey),
    fromEmail: connectionSettings.settings.from_email
  };
}

interface SendInviteEmailParams {
  to: string;
  clientName: string;
  coachName: string;
  inviteLink: string;
  questionnaireName?: string;
  message?: string;
}

export async function sendInviteEmail({
  to,
  clientName,
  coachName,
  inviteLink,
  questionnaireName,
  message
}: SendInviteEmailParams) {
  const { client, fromEmail } = await getUncachableResendClient();
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Wellio</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.6;
          color: #333333;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #28A0AE 0%, #E2F9AD 100%);
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          color: #ffffff;
          font-size: 32px;
          font-weight: 700;
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .content {
          padding: 40px 30px;
        }
        .content h2 {
          color: #28A0AE;
          font-size: 24px;
          margin-top: 0;
          margin-bottom: 20px;
        }
        .content p {
          margin: 16px 0;
          color: #555555;
        }
        .message-box {
          background-color: #f8f9fa;
          border-left: 4px solid #28A0AE;
          padding: 16px 20px;
          margin: 24px 0;
          border-radius: 4px;
        }
        .message-box p {
          margin: 0;
          font-style: italic;
          color: #666666;
        }
        .cta-button {
          display: inline-block;
          background-color: #28A0AE;
          color: #ffffff;
          text-decoration: none;
          padding: 14px 32px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          margin: 24px 0;
          transition: background-color 0.2s;
        }
        .cta-button:hover {
          background-color: #1f8491;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 24px 30px;
          text-align: center;
          border-top: 1px solid #e9ecef;
        }
        .footer p {
          margin: 8px 0;
          font-size: 14px;
          color: #666666;
        }
        .footer a {
          color: #28A0AE;
          text-decoration: none;
        }
        .steps {
          background-color: #f8f9fa;
          border-radius: 6px;
          padding: 24px;
          margin: 24px 0;
        }
        .steps h3 {
          color: #28A0AE;
          font-size: 18px;
          margin-top: 0;
          margin-bottom: 16px;
        }
        .steps ol {
          margin: 0;
          padding-left: 20px;
        }
        .steps li {
          margin: 8px 0;
          color: #555555;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Wellio</h1>
        </div>
        
        <div class="content">
          <h2>Hi ${clientName}! 👋</h2>
          
          <p>You've been invited by <strong>${coachName}</strong> to join Wellio, a platform designed to help you achieve your fitness and wellness goals.</p>
          
          ${message ? `
            <div class="message-box">
              <p>"${message}"</p>
              <p style="margin-top: 8px; font-size: 14px;"><em>- ${coachName}</em></p>
            </div>
          ` : ''}
          
          <div class="steps">
            <h3>Next Steps:</h3>
            <ol>
              <li>Click the button below to complete your onboarding questionnaire</li>
              ${questionnaireName ? `<li>Fill out the "${questionnaireName}" form</li>` : '<li>Fill out your initial health and fitness assessment</li>'}
              <li>Your account will be automatically created</li>
              <li>Start your journey with personalized coaching</li>
            </ol>
          </div>
          
          <div style="text-align: center;">
            <a href="${inviteLink}" class="cta-button">Complete Your Onboarding</a>
          </div>
          
          <p style="margin-top: 32px; font-size: 14px; color: #666666;">
            This link is unique to you. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
        
        <div class="footer">
          <p><strong>Wellio</strong> - AI-Powered Fitness & Wellness Coaching</p>
          <p>Need help? Contact ${coachName} directly.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const emailText = `
Welcome to Wellio!

Hi ${clientName},

You've been invited by ${coachName} to join Wellio, a platform designed to help you achieve your fitness and wellness goals.

${message ? `Personal message from ${coachName}:\n"${message}"\n\n` : ''}

Next Steps:
1. Complete your onboarding questionnaire by clicking the link below
${questionnaireName ? `2. Fill out the "${questionnaireName}" form` : '2. Fill out your initial health and fitness assessment'}
3. Your account will be automatically created
4. Start your journey with personalized coaching

Complete Your Onboarding:
${inviteLink}

This link is unique to you. If you didn't expect this invitation, you can safely ignore this email.

---
Wellio - AI-Powered Fitness & Wellness Coaching
Need help? Contact ${coachName} directly.
  `;

  try {
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: `${coachName} invited you to Wellio`,
      html: emailHtml,
      text: emailText,
    });

    if (error) {
      console.error('[Email] Failed to send invite email:', error);
      throw error;
    }

    console.log('[Email] Invite email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('[Email] Error sending invite email:', error);
    throw error;
  }
}
