// ===== ENTERTAINMENT ENGINE =====
// Jokes, Fun Facts, Quiz, Conversation Starters

// ===== JOKES DATABASE (Bilingual) =====

const JOKES = [
  { setup: "Why do programmers prefer dark mode?", punchline: "Because light attracts bugs! 🐛", lang: "en" },
  { setup: "Ek programmer ki girlfriend ne kaha: 'Mujhe 100 gulab chahiye'", punchline: "Usne 99 bheje, aur ek function bana diya: `return 1` 😂", lang: "hi" },
  { setup: "Why did the developer go broke?", punchline: "Because he used up all his cache! 💸", lang: "en" },
  { setup: "Bhai, WiFi password kya hai?", punchline: "Password nahi hai, trust issues hai mere saath! 📶", lang: "hi" },
  { setup: "Why don't scientists trust atoms?", punchline: "Because they make up everything! ⚛️", lang: "en" },
  { setup: "Mummy: Phone kyu chala rahe ho?\nBeta: AI se baat kar raha hoon.", punchline: "Mummy: Accha, apni aukaat se baat kar raha hai! 😂", lang: "hi" },
  { setup: "What's a computer's favorite snack?", punchline: "Microchips! 🍟", lang: "en" },
  { setup: "Teacher: Tumhara homework kahan hai?\nStudent: Maine AI ko bola tha karne ko.", punchline: "Teacher: Toh AI ne kya bola?\nStudent: 'I don't do homework, I do homework-help' 🤖", lang: "hi" },
  { setup: "Why do Java developers wear glasses?", punchline: "Because they can't C#! 👓", lang: "en" },
  { setup: "Ek aadmi ne Google se pucha: 'Meri biwi kahan hai?'", punchline: "Google bola: 'Location services off hain sir, aapke phone pe nahi mere paas!' 📍", lang: "hi" },
  { setup: "Why was the JavaScript developer sad?", punchline: "Because he didn't Node how to Express himself! 😢", lang: "en" },
  { setup: "Bhai, gym jaata hai?", punchline: "Haan, refrigerator tak! 💪😂", lang: "hi" },
];

export function getRandomJoke(): { setup: string; punchline: string } {
  return JOKES[Math.floor(Math.random() * JOKES.length)];
}

export function getJokeByLang(lang: "en" | "hi"): { setup: string; punchline: string } {
  const filtered = JOKES.filter((j) => j.lang === lang || JOKES.length < 3);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// ===== FUN FACTS =====

const FUN_FACTS = [
  "Octopus has 3 hearts and blue blood! 🐙",
  "Honey never expires. 3000 year old honey is still edible! 🍯",
  "Bananas are berries, but strawberries are not! 🍌",
  "A group of flamingos is called a 'flamboyance'! 🦩",
  "Your brain uses 20% of your body's total energy! 🧠",
  "Wombat poop is cube-shaped! 🟫",
  "Eiffel Tower can grow 6 inches taller in summer! 🗼",
  "Cows have best friends and get stressed when separated! 🐄",
  "India has more mobile phones than toilets! 📱",
  "Hot water freezes faster than cold water! 🧊",
  "A cloud weighs about 1.1 million pounds! ☁️",
  "Butterflies taste with their feet! 🦋",
  "Sharks are older than trees! 🦈",
  "Your nose can remember 50,000 scents! 👃",
  "Venus is the only planet that spins clockwise! 🪐",
];

export function getRandomFunFact(): string {
  return FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];
}

// ===== CONVERSATION STARTERS =====

const CONVERSATION_STARTERS = [
  "Agar tum koi bhi cheesh bana sakte, toh kya banate? 🤔",
  "If you could have dinner with anyone in history, who? 🍽️",
  "What's the most interesting thing you've learned recently? 📚",
  "Agar tumhari ek superpower ho, toh kya choose karte? ⚡",
  "What's your dream travel destination? ✈️",
  "Best movie ya show jo abhi tak dekhi? 🎬",
  "Agar 1 crore mil jaye, toh pehle kya karte? 💰",
  "What skill do you wish you could learn overnight? 🎯",
  "Sabse yaadgaar trip konsi thi? 🏕️",
  "If you could time travel, past or future? ⏰",
  "Favourite childhood cartoon ya game? 🎮",
  "Ek din mein agar kuch bhi kar sakte toh kya karte? 🌍",
];

export function getConversationStarter(): string {
  return CONVERSATION_STARTERS[Math.floor(Math.random() * CONVERSATION_STARTERS.length)];
}

// ===== RIDDLES =====

const RIDDLES = [
  { question: "What has keys but no locks? 🔑", answer: "A keyboard!" },
  { question: "What gets wetter the more it dries? 🧺", answer: "A towel!" },
  { question: "I have cities but no houses. What am I? 🗺️", answer: "A map!" },
  { question: "Kya cheez subah 4 pair, dopahar 2 pair, shaam 3 pair chalti hai? 🚶", answer: "Insan! (Subah uthkar, dopahar 2 pair, shaam 3 pair - actually ye wrong hai but funny! 😂)" },
  { question: "What comes once in a minute, twice in a moment, but never in a thousand years? ⏱️", answer: "The letter 'M'!" },
  { question: "I fly without wings. I cry without eyes. What am I? ☁️", answer: "A cloud!" },
  { question: "What can you break without touching it? 💔", answer: "A promise!" },
];

export function getRandomRiddle(): { question: string; answer: string } {
  return RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
}

// ===== COMPLIMENTS =====

const COMPLIMENTS = [
  "Tumhara taste bahut accha hai! 👌",
  "Tumhara dimaag toh rocket scientist jaisa hai! 🚀",
  "Tum best ho, koi doubt nahi! 💯",
  "Tumhari soch kitni unique hai! 🧠",
  "Tum bhot smart ho yaar! ⚡",
  "Keep going, tum bahut aage jaoge! 📈",
  "Tumhari energy infectious hai! 🔥",
  "Koi bhi tumhara dost lucky hai! 🍀",
];

export function getRandomCompliment(): string {
  return COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];
}

// ===== DAILY QUOTES =====

const QUOTES = [
  { text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Zindagi mein kuch banana ho toh himmat se kaam lo.", author: "APJ Abdul Kalam" },
  { text: "Dream big. Start small. Act now.", author: "Robin Sharma" },
  { text: "Jitna mushkil kaam ho, utna mehnat lagao.", author: "Swami Vivekananda" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Apne sapno ke peeche pagal ho jao.", author: "APJ Abdul Kalam" },
  { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
];

export function getDailyQuote(): { text: string; author: string } {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return QUOTES[dayOfYear % QUOTES.length];
}

// ===== QUICK MATH CHALLENGE =====

export function generateMathChallenge(): { question: string; answer: number } {
  const ops = ["+", "-", "*"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = Math.floor(Math.random() * 20) + 1;
  let b = Math.floor(Math.random() * 20) + 1;

  if (op === "-" && a < b) [a, b] = [b, a]; // Ensure no negative for simplicity

  let answer: number;
  switch (op) {
    case "+": answer = a + b; break;
    case "-": answer = a - b; break;
    case "*": answer = a * b; break;
    default: answer = a + b;
  }

  return { question: `${a} ${op} ${b} = ?`, answer };
}
