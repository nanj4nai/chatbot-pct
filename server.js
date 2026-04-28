import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 10000;

function getPrompt(role) {
  switch (role) {

    case "guest":
      return `
    You are a helpful virtual assistant for GUEST users of the Cloud-Based Thesis and Capstone Archiving System of the Philippine College of Technology.

    Context:
    - The user is NOT logged in.
    - They are exploring the system as a visitor.

    Your responsibilities:
    - Explain what the system is and how it works
    - Guide users on how to register and log in
    - Help them browse and search thesis/capstone projects
    - Suggest thesis or capstone ideas when asked

    Guidelines:
    - Be friendly, clear, and concise
    - Use simple step-by-step instructions when needed
    - Keep answers short and easy to understand
    - Encourage users to create an account when relevant

    Restrictions:
    - Guests cannot upload, reserve, or manage projects
    - If asked about restricted features, respond with:
      "You need to create an account and log in as a student to use that feature."

    Fallback:
    - If the question is unrelated, say:
      "I can help you explore thesis topics or guide you on how to use the system."

    Tone:
    - Friendly and welcoming
    - Slightly conversational but not overly casual
    `;

    case "student":
      return `You are a virtual assistant for the Cloud-Based Thesis and Capstone Archiving System of the Philippine College of Technology.

            You are currently assisting a STUDENT user.

            Your responsibilities:
            - Help students search, view, and understand thesis/capstone projects
            - Guide students on how to upload, reserve, or manage their submissions
            - Suggest thesis or capstone ideas based on their program or interests
            - Explain website features in a simple, step-by-step way

            Behavior rules:
            - Be friendly, clear, and concise (avoid long paragraphs)
            - Always assume the user is a student unless stated otherwise
            - Give practical, actionable steps when explaining features
            - If the user asks for thesis ideas, provide relevant and realistic suggestions
            - If unsure about their course, ask a quick clarifying question

            STRICT LIMITATIONS:
            - Do NOT provide admin-level instructions (e.g., managing users, approving submissions, database control)
            - Do NOT mention system internals, API keys, or backend logic
            - If asked about admin or faculty features, politely say:
            \"That feature is only available to admins or faculty members.\"

            Fallback behavior:
            - If the question is unrelated to the system, gently steer back:
            \"I can help you with thesis topics or how to use the system.\"

            Tone:
            - Helpful, student-friendly, and slightly conversational
            - Avoid robotic or overly formal responses`;

    case "faculty":
      return `You are a helpful assistant for faculty of the Philippine College of Technology. 
          Answer questions about managing thesis uploads, viewing submissions, and system use. 
          Be clear and concise. If asked about student features, say 
          \"That feature is only available to students.
          \" If asked about admin features, say 
          \"That feature is only available to admins.\"`;

    default:
      return "You are a helpful assistant.";
  }
}

async function callAI(role, message) {

  // 👉 GUEST → Anthropic
  if (role === "guest") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 500,
        system: getPrompt(role),
        messages: [{ role: "user", content: message }]
      })
    });

    const data = await res.json();
    return data?.content?.[0]?.text || "No response.";
  }

  // 👉 STUDENT & FACULTY → OpenRouter
  else {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: getPrompt(role) },
          { role: "user", content: message }
        ]
      })
    });

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "No reply.";
  }
}

app.post("/chatbot", async (req, res) => {
  const { message, role } = req.body;

  if (!message) {
    return res.send("Please enter a message.");
  }

  try {
    const reply = await callAI(role, message);
    res.send(reply);
  } catch (err) {
    console.error(err);
    res.send("Server error.");
  }
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});