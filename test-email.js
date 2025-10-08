// test-email.js
const { SendMailClient } = require("zeptomail");

const url = "https://api.zeptomail.in/";
// PASTE YOUR FULL TOKEN HERE
const token = "Zoho-enczapikey PHtE6r1bS+DjjmErpBkH5KC7HpOgMN59/b9jfVMUtIdBX/BRH01Qo48ulzS/+B54VKZGRvCcwYxtuOnKte2BJGy5YGYaWGqyqK3sx/VYSPOZsbq6x00btVQccELdVIDrdtNq1yzVudnZNA=="; 

const client = new SendMailClient({ url, token });

async function runTest() {
  console.log("Attempting to send a test email from the isolated script...");
  try {
    const response = await client.sendMail({
      from: {
        address: "no-reply@megamind.studio",
        name: "megamind Test",
      },
      to: [
        {
          email_address: {
            // !!! USE YOUR OWN EMAIL ADDRESS HERE FOR TESTING !!!
            address: "jamshadconnect@gmail.com", 
            name: "Test Recipient",
          },
        },
      ],
      subject: "ZeptoMail Test from Isolated Script",
      htmlbody: "<h1>This is a test.</h1><p>If you received this, the SDK and token are working correctly.</p>",
    });
    console.log("✅✅✅ SUCCESS! The isolated script worked. ✅✅✅");
    console.log("API Response:", response);
  } catch (error) {
    console.error("❌❌❌ ERROR! The isolated script failed. ❌❌❌");
    console.error(error); // This will show the full error, including the type
  }
}

runTest();