const express = require("express");
const router = express.Router();

console.log("✅ AI ROUTES LOADED");

const { processAIQuery } = require("../services/aiService");

// AI Assistant Page
router.get("/", (req, res) => {
console.log("✅ /ai route opened");


try {
    res.render("aiAssistant", {
        user: req.session?.userId || null
    });
} catch (error) {
    console.error("AI Page Error:", error);
    res.status(500).send("Error loading AI Assistant page");
}


});

// Ask AI
router.post("/ask", async (req, res) => {
try {


    const { message } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({
            success: false,
            reply: "Please enter a message.",
            workers: []
        });
    }

    const result = await processAIQuery(message);

    return res.json({
        success: true,
        reply: result.reply,
        workers: result.workers || []
    });

} catch (error) {

    console.error("AI Ask Error:", error);

    return res.status(500).json({
        success: false,
        reply: "Something went wrong.",
        workers: []
    });
}


});

// Test Route
router.get("/test", (req, res) => {
res.send("✅ AI Route Working");
});

module.exports = router;
