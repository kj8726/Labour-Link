const User = require("../models/User");

async function processAIQuery(query) {
    try {

        const text = query.toLowerCase().trim();

        // ==========================
        // Worker Registration
        // ==========================

        if (
            text.includes("become worker") ||
            text.includes("become a worker") ||
            text.includes("register worker") ||
            text.includes("worker registration") ||
            text.includes("join labour") ||
            text.includes("join labor")
        ) {
            return {
                reply:
                    "👷 To become a worker:\n\n" +
                    "1. Register an account\n" +
                    "2. Select Labour during signup\n" +
                    "3. Complete your profile\n" +
                    "4. Add profession and experience\n" +
                    "5. Set your hourly & daily rates\n" +
                    "6. Upload portfolio/work samples\n" +
                    "7. Start receiving job requests",
                workers: []
            };
        }

        // ==========================
        // Top Rated Workers
        // ==========================

        if (
            text.includes("top rated") ||
            text.includes("best workers") ||
            text.includes("best labour") ||
            text.includes("top workers")
        ) {

            const workers = await User.find({
                userType: "labour",
                isActive: true
            })
            .sort({ rating: -1 })
            .limit(5);

            if (!workers.length) {
                return {
                    reply: "No workers found.",
                    workers: []
                };
            }

            let response = "🏆 Top Rated Workers:\n\n";

            workers.forEach((worker, index) => {

                response +=
                    `${index + 1}. 👤 ${worker.name}\n` +
                    `🔧 ${worker.profession}\n` +
                    `⭐ ${worker.rating || 0} (${worker.totalReviews || 0} reviews)\n` +
                    `💰 ₹${worker.wagePerHour || 0}/hour\n` +
                    `📍 ${worker.address?.city || "Unknown"}\n` +
                    `🔗 /professional/${worker._id}\n\n`;

            });

            return {
                reply: response,
                workers
            };
        }

        // ==========================
        // Cheapest Workers
        // ==========================

        if (
            text.includes("cheap") ||
            text.includes("cheapest") ||
            text.includes("lowest price")
        ) {

            const workers = await User.find({
                userType: "labour",
                isActive: true
            })
            .sort({ wagePerHour: 1 })
            .limit(5);

            if (!workers.length) {
                return {
                    reply: "No workers found.",
                    workers: []
                };
            }

            let response = "💰 Cheapest Workers:\n\n";

            workers.forEach((worker, index) => {

                response +=
                    `${index + 1}. 👤 ${worker.name}\n` +
                    `🔧 ${worker.profession}\n` +
                    `💰 ₹${worker.wagePerHour || 0}/hour\n` +
                    `📍 ${worker.address?.city || "Unknown"}\n` +
                    `🔗 /professional/${worker._id}\n\n`;

            });

            return {
                reply: response,
                workers
            };
        }

        // ==========================
        // Profession Search
        // ==========================

        const cityMatch = text.match(/(?:in|near)\s+([a-zA-Z\s]+)/i);

        let city = null;

        if (cityMatch) {
            city = cityMatch[1].trim();
        }

        const professions = [
            "plumber",
            "electrician",
            "painter",
            "carpenter",
            "cleaner",
            "gardener",
            "mason",
            "ac repair",
            "welder",
            "mechanic",
            "technician"
        ];

        for (const profession of professions) {

            if (text.includes(profession)) {

                let filter = {
                    userType: "labour",
                    isActive: true,
                    profession: {
                        $regex: profession,
                        $options: "i"
                    }
                };

                if (city) {
                    filter["address.city"] = {
                        $regex: city,
                        $options: "i"
                    };
                }

                const workers = await User.find(filter)
                    .sort({ rating: -1 })
                    .limit(5);

                if (!workers.length) {
                    return {
                        reply: city
                            ? `Sorry, no ${profession}s found in ${city}.`
                            : `Sorry, no ${profession}s found right now.`,
                        workers: []
                    };
                }

                let response = city
                    ? `📍 Found ${workers.length} ${profession}(s) in ${city}:\n\n`
                    : `📍 Found ${workers.length} ${profession}(s):\n\n`;

                workers.forEach((worker, index) => {

                    response +=
                        `${index + 1}. 👤 ${worker.name}\n` +
                        `🔧 ${worker.profession}\n` +
                        `⭐ ${worker.rating || 0} (${worker.totalReviews || 0} reviews)\n` +
                        `💰 ₹${worker.wagePerHour || 0}/hour\n` +
                        `📍 ${worker.address?.city || "Unknown"}\n` +
                        `🔗 /professional/${worker._id}\n\n`;

                });

                return {
                    reply: response,
                    workers
                };
            }
        }

        // ==========================
        // Price Questions
        // ==========================

        if (
            text.includes("price") ||
            text.includes("cost") ||
            text.includes("charge") ||
            text.includes("rate")
        ) {
            return {
                reply:
                    "💡 Worker charges depend on profession, experience and location.\n\n" +
                    "Try:\n" +
                    "• Find painter\n" +
                    "• Find electrician\n" +
                    "• Cheapest workers\n" +
                    "• Top rated workers",
                workers: []
            };
        }

        // ==========================
        // Help
        // ==========================

        return {
            reply:
                "🤖 Labour-Link AI can help you:\n\n" +
                "• Find painter\n" +
                "• Find electrician\n" +
                "• Find plumber\n" +
                "• Find carpenter\n" +
                "• Find mechanic\n" +
                "• Find welder\n" +
                "• Find painter in Pune\n" +
                "• Top rated workers\n" +
                "• Cheapest workers\n" +
                "• How can I become a worker?",
            workers: []
        };

    } catch (error) {

        console.error("AI Service Error:", error);

        return {
            reply: "❌ Error processing your request.",
            workers: []
        };
    }
}

module.exports = {
    processAIQuery
};