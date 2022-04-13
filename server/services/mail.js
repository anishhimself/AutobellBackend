const nodemailer = require("nodemailer");

let transporter = nodemailer.createTransport({
  service: "gmail",
  // host: "smtp.ethereal.email",
  // port: 587,
  // secure: false, // true for 465, false for other ports
  auth: {
    user: "fiveselected@gmail.com",
    pass: "gguyredzgxsoltdc",

    // user: "halkapan123@gmail.com", // generated ethereal user
    // pass: "Hello@123", // generated ethereal password
  },
});

// send mail with defined transport object
const sendEmail = async ({ to, subject, text, html = null }) => {
  let info = await transporter.sendMail({
    from: '"AutoBellGears Nepal" <fiveselected@gmail.com>', // sender address
    to, // list of receivers
    subject, // Subject line
    text, // plain text body
    // html: "<b>Hello world?</b>", // html body
  });

  // console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
};

// main().catch(console.error);

module.exports = {
  sendEmail,
};

// mail({
//   to: "laxojab583@simdpi.com",
//   subject: "This is subject",
//   text: "byebye",
// });
