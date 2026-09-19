import AWS from "aws-sdk";

AWS.config.update({
  accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
  region: process.env.AWS_SES_REGION || "ap-south-1",
});

const ses = new AWS.SES({ apiVersion: "2010-12-01" });

export async function sendFriendRequestEmail(
  toEmail: string,
  toUsername: string,
  fromUsername: string,
): Promise<void> {
  try {
    if (
      !process.env.AWS_SES_ACCESS_KEY_ID ||
      !process.env.AWS_SES_SECRET_ACCESS_KEY ||
      !process.env.AWS_SES_SENDER_EMAIL
    ) {
      console.log("SES not configured — skipping friend request email");
      return;
    }

    await ses
      .sendEmail({
        Source: process.env.AWS_SES_SENDER_EMAIL,
        Destination: { ToAddresses: [toEmail] },
        Message: {
          Subject: {
            Data: `${fromUsername} sent you a friend request on MoodSync`,
          },
          Body: {
            Html: {
              Data: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #534AB7;">New Friend Request</h2>
          <p>Hi ${toUsername},</p>
          <p><strong>${fromUsername}</strong> just sent you a friend request on MoodSync.</p>
          <p>Log in to your account to accept or decline it.</p>
          <p style="color: #888; font-size: 12px; margin-top: 32px;">— The MoodSync Team</p>
        </div>
      `,
            },
          },
        },
      })
      .promise();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log("Failed to send friend request email:", message);
  }
}
