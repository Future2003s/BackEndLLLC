"use strict";
// Simple spam and profanity detection with content sanitization
// This is a lightweight heuristic. For production, consider integrating a dedicated service.
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeContent = analyzeContent;
const PROFANITY_LIST = [
    "damn",
    "shit",
    "fuck",
    "bitch",
    "asshole",
    "bastard",
    "crap"
];
const SPAM_PATTERNS = [
    { name: "too_many_links", regex: /(https?:\/\/|www\.)/gi },
    { name: "repeated_chars", regex: /(.)\1{6,}/i },
    { name: "marketing_phrases", regex: /(buy now|free|click here|subscribe)/i },
    { name: "contact_spam", regex: /(telegram|whatsapp|wechat|email me)/i }
];
function analyzeContent(title, comment) {
    const reasons = [];
    let sanitizedTitle = title || "";
    let sanitizedComment = comment || "";
    // Profanity masking
    const maskWord = (word) => word[0] + "*".repeat(Math.max(0, word.length - 1));
    const profanityRegex = new RegExp(`\\b(${PROFANITY_LIST.join("|")})\\b`, "gi");
    if (profanityRegex.test(sanitizedTitle) || profanityRegex.test(sanitizedComment)) {
        reasons.push("profanity");
        sanitizedTitle = sanitizedTitle.replace(profanityRegex, (m) => maskWord(m));
        sanitizedComment = sanitizedComment.replace(profanityRegex, (m) => maskWord(m));
    }
    // Spam patterns
    for (const pattern of SPAM_PATTERNS) {
        if (pattern.regex.test(sanitizedTitle) || pattern.regex.test(sanitizedComment)) {
            reasons.push(pattern.name);
        }
    }
    // Excessive emoji
    const emojiRegex = /([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])/u;
    const emojiCount = (sanitizedTitle + sanitizedComment).split("").filter((c) => emojiRegex.test(c)).length;
    if (emojiCount > 10) {
        reasons.push("excessive_emoji");
    }
    // Length checks
    if (sanitizedComment.length > 2000) {
        reasons.push("too_long");
        sanitizedComment = sanitizedComment.slice(0, 2000);
    }
    // Trim spaces
    sanitizedTitle = sanitizedTitle.trim();
    sanitizedComment = sanitizedComment.trim();
    const isSuspicious = reasons.length > 0;
    return { isSuspicious, reasons, sanitizedTitle, sanitizedComment };
}
