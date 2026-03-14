## Quick Test - View Bills in Console

If you want to see what the WhatsApp bill looks like without setting up Twilio:

1. Look at your terminal where `node server.js` is running
2. After placing an order, you'll see output like:

```
📱 Sending WhatsApp to: whatsapp:+919428669420
Message:
🧾 *Shreeji Farshan - Order Confirmation*

Order ID: #1
Payment: Cash on Delivery

*Items:*
1. Keshar Penda x1 - ₹839

*Total Amount: ₹839*

Please keep exact change ready.
Thank you for your order! 🙏

⚠ Mock mode - Message logged but not sent (Twilio not configured)
```

This shows exactly what would be sent to WhatsApp once Twilio is configured.

---

**To actually receive on WhatsApp:** Follow the Twilio setup in `HOW_TO_GET_WHATSAPP_BILLS.md`
