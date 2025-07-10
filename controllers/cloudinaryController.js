import crypto from "crypto";

export const deleteImageFromCloudinary = async (req, res) => {
  const publicId = req.query.publicId;
  if (!publicId) {
    return res.status(400).json({ error: "publicId is required" });
  }
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${process.env.EXPO_PUBLIC_APPLICATION_KEY_SECRET}`;
    const signature = crypto.createHash("sha1").update(stringToSign).digest("hex");
    const response = await fetch("https://api.cloudinary.com/v1_1/dzzkzubs0/image/destroy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        public_id: publicId,
        api_key: process.env.EXPO_PUBLIC_APPLICATION_KEY_ID,
        timestamp,
        signature,
      }),
    });
    const result = await response.json();
    if (result.result !== "ok") {
  console.error("Cloudinary response:", result);
  return res.status(500).json({ success: false, error: result });
}
    if (result.result === "ok") {
      return res.status(200).json({ success: true });
    } else {
      return res.status(500).json({ success: false, error: result });
    }
  } catch (error) {
    console.error("Cloudinary delete error:", error.message);
    return res.status(500).json({ error: "Server error" });
  }
};