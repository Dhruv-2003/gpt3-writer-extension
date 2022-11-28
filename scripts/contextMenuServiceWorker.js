// Function to get + decode API key
const getKey = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["openai-key"], (result) => {
      if (result["openai-key"]) {
        const decodedKey = atob(result["openai-key"]);
        resolve(decodedKey);
      }
    });
  });
};

const sendMessageToChrome = async (content) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0].id;

    chrome.tabs.sendMessage(
      activeTab,
      { message: "inject", content },
      (response) => {
        if (response.status === "failed") {
          console.log("injection failed.");
        }
      }
    );
  });
};

const generate = async (prompt) => {
  const key = await getKey();
  const url = "https://api.openai.com/v1/completions";

  // Call completions endpoint
  const completionResponse = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "text-davinci-002",
      prompt: prompt,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  // Select the top choice and send back
  const completion = await completionResponse.json();
  return completion.choices.pop();
};

const generateCompletionAction = async (info) => {
  try {
    sendMessageToChrome("generating...");

    const { selectionText } = info;
    const basePromptPrefix = `
    Create a comment explaining this code in Solidty 
      `;

    const baseCompletion = await generate(
      `${basePromptPrefix}${selectionText}`
    );

    const response = `*/ ${baseCompletion.text} /*`;
    sendMessageToChrome(response);
    console.log(response);
  } catch (error) {
    console.log(error);
    sendMessageToChrome(error.toString());
  }
};
chrome.contextMenus.create({
  id: "context-run",
  title: "Generate comment",
  contexts: ["selection"],
});

// Add listener
chrome.contextMenus.onClicked.addListener(generateCompletionAction);
