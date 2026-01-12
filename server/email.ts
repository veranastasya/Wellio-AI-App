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

import { EMAIL_TRANSLATIONS, SupportedLanguage } from "@shared/schema";

interface SendInviteEmailParams {
  to: string;
  clientName: string;
  coachName: string;
  inviteLink: string;
  questionnaireName?: string;
  message?: string;
  language?: SupportedLanguage;
}

interface SendPlanAssignmentEmailParams {
  to: string;
  clientName: string;
  coachName: string;
  planName: string;
  planLink: string;
  message?: string;
}

export async function sendInviteEmail({
  to,
  clientName,
  coachName,
  inviteLink,
  questionnaireName,
  message,
  language = "en"
}: SendInviteEmailParams) {
  const { client, fromEmail } = await getUncachableResendClient();
  const t = EMAIL_TRANSLATIONS.invite;
  const lang = language;
  
  // Build step 2 text based on whether questionnaire name is provided
  const step2Text = questionnaireName 
    ? `${t.step2WithName[lang]} "${questionnaireName}" ${t.step2Form[lang]}`.trim()
    : t.step2Default[lang];
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${t.welcomeTitle[lang]}</title>
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
          <h1>${t.welcomeTitle[lang]}</h1>
        </div>
        
        <div class="content">
          <h2>${t.greeting[lang]} ${clientName}!</h2>
          
          <p>${t.invitedBy[lang]} <strong>${coachName}</strong> ${t.platformDescription[lang]}</p>
          
          ${message ? `
            <div class="message-box">
              <p>"${message}"</p>
              <p style="margin-top: 8px; font-size: 14px;"><em>- ${coachName}</em></p>
            </div>
          ` : ''}
          
          <div class="steps">
            <h3>${t.nextStepsTitle[lang]}</h3>
            <ol>
              <li>${t.step1[lang]}</li>
              <li>${step2Text}</li>
              <li>${t.step3[lang]}</li>
              <li>${t.step4[lang]}</li>
            </ol>
          </div>
          
          <div style="text-align: center;">
            <a href="${inviteLink}" class="cta-button">${t.ctaButton[lang]}</a>
          </div>
          
          <p style="margin-top: 32px; font-size: 14px; color: #666666;">
            ${t.linkNotice[lang]}
          </p>
        </div>
        
        <div class="footer">
          <p><strong>Wellio</strong> - ${t.footerTagline[lang]}</p>
          <p>${t.needHelp[lang]} ${coachName} ${t.directly[lang]}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const emailText = `
${t.welcomeTitle[lang]}!

${t.greeting[lang]} ${clientName},

${t.invitedBy[lang]} ${coachName} ${t.platformDescription[lang]}

${message ? `${coachName}:\n"${message}"\n\n` : ''}

${t.nextStepsTitle[lang]}
1. ${t.step1[lang]}
2. ${step2Text}
3. ${t.step3[lang]}
4. ${t.step4[lang]}

${t.ctaButton[lang]}:
${inviteLink}

${t.linkNotice[lang]}

---
Wellio - ${t.footerTagline[lang]}
${t.needHelp[lang]} ${coachName} ${t.directly[lang]}
  `;

  try {
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: t.subject[lang],
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

interface SendAccountSetupEmailParams {
  to: string;
  clientName: string;
  coachName: string;
  setupLink: string;
  message?: string;
  language?: SupportedLanguage;
}

export async function sendAccountSetupEmail({
  to,
  clientName,
  coachName,
  setupLink,
  message,
  language = "en"
}: SendAccountSetupEmailParams) {
  const { client, fromEmail } = await getUncachableResendClient();
  const lang = language as SupportedLanguage;
  const t = EMAIL_TRANSLATIONS.accountSetup;
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${t.subject[lang]}</title>
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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${t.welcomeTitle[lang]}</h1>
        </div>
        
        <div class="content">
          <h2>${t.greeting[lang]} ${clientName}!</h2>
          
          <p>${t.addedBy[lang]} <strong>${coachName}</strong> ${t.platformDescription[lang]}</p>
          
          ${message ? `
            <div class="message-box">
              <p>"${message}"</p>
              <p style="margin-top: 8px; font-size: 14px;"><em>- ${coachName}</em></p>
            </div>
          ` : ''}
          
          <div style="text-align: center;">
            <a href="${setupLink}" class="cta-button" style="color: #ffffff; text-decoration: none;">${t.ctaButton[lang]}</a>
          </div>
          
          <p style="margin-top: 32px; font-size: 14px; color: #666666;">
            ${t.linkNotice[lang]}
          </p>
        </div>
        
        <div class="footer">
          <p><strong>Wellio</strong> - ${t.footerTagline[lang]}</p>
          <p>${t.needHelp[lang]} ${coachName} ${t.directly[lang]}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const emailText = `
${t.welcomeTitle[lang]}

${t.greeting[lang]} ${clientName},

${t.addedBy[lang]} ${coachName} ${t.platformDescription[lang]}

${message ? `${coachName}:\n"${message}"\n\n` : ''}

${t.ctaButton[lang]}:
${setupLink}

${t.linkNotice[lang]}

---
Wellio - ${t.footerTagline[lang]}
${t.needHelp[lang]} ${coachName} ${t.directly[lang]}
  `;

  try {
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: t.subject[lang],
      html: emailHtml,
      text: emailText,
    });

    if (error) {
      console.error('[Email] Failed to send account setup email:', error);
      throw error;
    }

    console.log('[Email] Account setup email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('[Email] Error sending account setup email:', error);
    throw error;
  }
}

export async function sendPlanAssignmentEmail({
  to,
  clientName,
  coachName,
  planName,
  planLink,
  message
}: SendPlanAssignmentEmailParams) {
  const { client, fromEmail } = await getUncachableResendClient();
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Wellness Plan Assigned</title>
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
        .plan-highlight {
          background-color: #f8f9fa;
          border-left: 4px solid #28A0AE;
          padding: 20px;
          margin: 24px 0;
          border-radius: 4px;
        }
        .plan-highlight h3 {
          margin: 0 0 8px 0;
          color: #28A0AE;
          font-size: 20px;
        }
        .plan-highlight p {
          margin: 0;
          color: #666666;
          font-size: 14px;
        }
        .message-box {
          background-color: #f8f9fa;
          border-left: 4px solid #E2F9AD;
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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Wellness Plan</h1>
        </div>
        
        <div class="content">
          <h2>Hi ${clientName}!</h2>
          
          <p><strong>${coachName}</strong> has created a personalized wellness plan for you!</p>
          
          <div class="plan-highlight">
            <h3>${planName}</h3>
            <p>Your coach has put together a customized plan to help you reach your goals.</p>
          </div>
          
          ${message ? `
            <div class="message-box">
              <p>"${message}"</p>
              <p style="margin-top: 8px; font-size: 14px;"><em>- ${coachName}</em></p>
            </div>
          ` : ''}
          
          <p>This plan is now available in your Wellio portal. Review it carefully and reach out to ${coachName} if you have any questions.</p>
          
          <div style="text-align: center;">
            <a href="${planLink}" class="cta-button">View Your Plan</a>
          </div>
          
          <p style="margin-top: 32px; font-size: 14px; color: #666666;">
            Ready to get started? Your wellness journey continues!
          </p>
        </div>
        
        <div class="footer">
          <p><strong>Wellio</strong> - AI-Powered Fitness & Wellness Coaching</p>
          <p>Questions? Contact ${coachName} directly.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const emailText = `
New Wellness Plan Assigned!

Hi ${clientName},

${coachName} has created a personalized wellness plan for you!

Plan: ${planName}
Your coach has put together a customized plan to help you reach your goals.

${message ? `Personal message from ${coachName}:\n"${message}"\n\n` : ''}

This plan is now available in your Wellio portal. Review it carefully and reach out to ${coachName} if you have any questions.

View Your Plan:
${planLink}

Ready to get started? Your wellness journey continues!

---
Wellio - AI-Powered Fitness & Wellness Coaching
Questions? Contact ${coachName} directly.
  `;

  try {
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: `${coachName} assigned you a new wellness plan`,
      html: emailHtml,
      text: emailText,
    });

    if (error) {
      console.error('[Email] Failed to send plan assignment email:', error);
      throw error;
    }

    console.log('[Email] Plan assignment email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('[Email] Error sending plan assignment email:', error);
    throw error;
  }
}

interface SendSessionBookingEmailParams {
  to: string;
  clientName: string;
  coachName: string;
  sessionDate: string;
  sessionTime: string;
  endTime?: string;
  sessionType: string;
  locationType: string;
  meetingLink?: string | null;
  notes?: string;
  timezoneLabel?: string;
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  consultation: 'Consultation',
  follow_up: 'Follow-up Session',
  check_in: 'Check-in',
  other: 'Session',
};

const LOCATION_TYPE_LABELS: Record<string, string> = {
  video: 'Video Call',
  phone: 'Phone Call',
  in_person: 'In Person',
};

export async function sendSessionBookingEmail({
  to,
  clientName,
  coachName,
  sessionDate,
  sessionTime,
  endTime,
  sessionType,
  locationType,
  meetingLink,
  notes,
  timezoneLabel
}: SendSessionBookingEmailParams) {
  const { client, fromEmail } = await getUncachableResendClient();
  
  const sessionTypeLabel = SESSION_TYPE_LABELS[sessionType] || sessionType;
  const locationTypeLabel = LOCATION_TYPE_LABELS[locationType] || locationType;
  
  const formattedDate = new Date(sessionDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const tzSuffix = timezoneLabel ? ` (${timezoneLabel})` : '';
  const timeDisplay = endTime ? `${sessionTime} - ${endTime}${tzSuffix}` : `${sessionTime}${tzSuffix}`;
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Session Scheduled</title>
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
          font-size: 28px;
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
        .session-details {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 24px;
          margin: 24px 0;
        }
        .session-details h3 {
          color: #28A0AE;
          font-size: 18px;
          margin-top: 0;
          margin-bottom: 16px;
        }
        .detail-row {
          display: flex;
          padding: 12px 0;
          border-bottom: 1px solid #e9ecef;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 600;
          color: #555555;
          width: 120px;
          flex-shrink: 0;
        }
        .detail-value {
          color: #333333;
        }
        .meeting-link-box {
          background-color: #28A0AE;
          color: #ffffff;
          padding: 16px 20px;
          border-radius: 6px;
          margin: 24px 0;
          text-align: center;
        }
        .meeting-link-box a {
          color: #ffffff;
          text-decoration: underline;
          font-weight: 600;
        }
        .notes-box {
          background-color: #f8f9fa;
          border-left: 4px solid #E2F9AD;
          padding: 16px 20px;
          margin: 24px 0;
          border-radius: 4px;
        }
        .notes-box p {
          margin: 0;
          font-style: italic;
          color: #666666;
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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Session Scheduled</h1>
        </div>
        
        <div class="content">
          <h2>Hi ${clientName}!</h2>
          
          <p><strong>${coachName}</strong> has scheduled a coaching session with you. Here are the details:</p>
          
          <div class="session-details">
            <h3>Session Details</h3>
            <div class="detail-row">
              <span class="detail-label">Type</span>
              <span class="detail-value">${sessionTypeLabel}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date</span>
              <span class="detail-value">${formattedDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Time</span>
              <span class="detail-value">${timeDisplay}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Location</span>
              <span class="detail-value">${locationTypeLabel}</span>
            </div>
          </div>
          
          ${meetingLink ? `
            <div class="meeting-link-box">
              <p style="margin: 0 0 8px 0; font-size: 14px;">Join the session:</p>
              <a href="${meetingLink}">${meetingLink}</a>
            </div>
          ` : ''}
          
          ${notes ? `
            <div class="notes-box">
              <p><strong>Notes:</strong> ${notes}</p>
            </div>
          ` : ''}
          
          <p style="margin-top: 32px; font-size: 14px; color: #666666;">
            If you need to reschedule or have any questions, please contact ${coachName} directly.
          </p>
        </div>
        
        <div class="footer">
          <p><strong>Wellio</strong> - AI-Powered Fitness & Wellness Coaching</p>
          <p>Questions? Contact ${coachName} directly.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const emailText = `
Session Scheduled!

Hi ${clientName},

${coachName} has scheduled a coaching session with you. Here are the details:

Session Details:
- Type: ${sessionTypeLabel}
- Date: ${formattedDate}
- Time: ${timeDisplay}
- Location: ${locationTypeLabel}
${meetingLink ? `- Meeting Link: ${meetingLink}` : ''}
${notes ? `- Notes: ${notes}` : ''}

If you need to reschedule or have any questions, please contact ${coachName} directly.

---
Wellio - AI-Powered Fitness & Wellness Coaching
Questions? Contact ${coachName} directly.
  `;

  try {
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: `Session Scheduled with ${coachName} - ${formattedDate}`,
      html: emailHtml,
      text: emailText,
    });

    if (error) {
      console.error('[Email] Failed to send session booking email:', error);
      throw error;
    }

    console.log('[Email] Session booking email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('[Email] Error sending session booking email:', error);
    throw error;
  }
}

interface SendPasswordResetEmailParams {
  to: string;
  userName: string;
  resetLink: string;
  userType: 'client' | 'coach';
}

export async function sendPasswordResetEmail({
  to,
  userName,
  resetLink,
  userType
}: SendPasswordResetEmailParams) {
  const { client, fromEmail } = await getUncachableResendClient();
  
  const portalType = userType === 'coach' ? 'Coach' : 'Client';
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
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
        }
        .warning-box {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 16px 20px;
          margin: 24px 0;
          border-radius: 4px;
        }
        .warning-box p {
          margin: 0;
          color: #856404;
          font-size: 14px;
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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Wellio</h1>
        </div>
        
        <div class="content">
          <h2>Reset Your Password</h2>
          
          <p>Hi ${userName},</p>
          
          <p>We received a request to reset your password for your Wellio ${portalType} account. Click the button below to set a new password:</p>
          
          <div style="text-align: center;">
            <a href="${resetLink}" class="cta-button">Reset Password</a>
          </div>
          
          <div class="warning-box">
            <p>This link will expire in 24 hours. If you didn't request a password reset, you can safely ignore this email.</p>
          </div>
          
          <p style="font-size: 14px; color: #888888;">If the button above doesn't work, copy and paste this link into your browser:</p>
          <p style="font-size: 12px; word-break: break-all; color: #28A0AE;">${resetLink}</p>
        </div>
        
        <div class="footer">
          <p><strong>Wellio</strong> - AI-Powered Fitness & Wellness Coaching</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const emailText = `
Reset Your Password

Hi ${userName},

We received a request to reset your password for your Wellio ${portalType} account.

Reset your password by visiting:
${resetLink}

This link will expire in 24 hours. If you didn't request a password reset, you can safely ignore this email.

---
Wellio - AI-Powered Fitness & Wellness Coaching
This is an automated message. Please do not reply to this email.
  `;

  try {
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: 'Reset Your Wellio Password',
      html: emailHtml,
      text: emailText,
    });

    if (error) {
      console.error('[Email] Failed to send password reset email:', error);
      throw error;
    }

    console.log('[Email] Password reset email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('[Email] Error sending password reset email:', error);
    throw error;
  }
}
