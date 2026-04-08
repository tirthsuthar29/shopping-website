// chatbot.js - True LLM AI Agent using Gemini API for NovaTech

document.addEventListener('DOMContentLoaded', () => {

    const chatHtml = `
        <div class="chatbot-widget">
            <button class="chat-toggle" id="chatOpenBtn">
                <i class="fas fa-robot"></i>
            </button>
            <div class="chat-window" id="chatWindow" style="transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1); transform: scale(0.9) translateY(20px); opacity: 0; pointer-events: none;">
                <div class="chat-header" style="background: linear-gradient(135deg, #1e1b4b, #6366f1);">
                    <div class="chat-header-info">
                        <div class="chat-bot-avatar" style="background: linear-gradient(135deg, #a5b4fc, #818cf8); color: #1e1b4b;"><i class="fas fa-brain"></i></div>
                        <div>
                            <div style="font-weight:700; font-size:1.05rem; letter-spacing:0.3px;">NOVATECH AI</div>
                            <div style="font-size:0.65rem; opacity:0.9; display:flex; align-items:center; gap:4px;" id="chatStatus">
                                <div style="width:5px; height:5px; border-radius:50%; background:#4ade80;"></div> System Active
                            </div>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:5px;">
                        <button class="icon-btn" id="newChatBtn" style="color:white; background:none; border:none; cursor:pointer; font-size:0.9rem;" title="New Chat"><i class="fas fa-trash-alt"></i></button>
                        <button class="icon-btn" id="refreshChatBtn" style="color:white; background:none; border:none; cursor:pointer; font-size:0.9rem;" title="Refresh UI"><i class="fas fa-sync-alt"></i></button>
                        <button class="icon-btn" id="exportChatBtn" style="color:white; background:none; border:none; cursor:pointer; font-size:0.9rem;" title="Export History"><i class="fas fa-file-export"></i></button>
                        <button class="icon-btn" id="chatCloseBtn" style="color:white; background:none; border:none; cursor:pointer;"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                <!-- Chat Navigation Tabs -->
                <div style="display:flex; background:rgba(255,255,255,0.05); border-bottom:1px solid rgba(0,0,0,0.05);">
                    <button id="tabChat" style="flex:1; padding:10px; border:none; background:none; color:#8b5cf6; font-size:0.75rem; font-weight:700; cursor:pointer; border-bottom:2px solid #8b5cf6;">ACTIVE CHAT</button>
                    <button id="tabHistory" style="flex:1; padding:10px; border:none; background:none; color:#64748b; font-size:0.75rem; font-weight:600; cursor:pointer; border-bottom:2px solid transparent;">FULL HISTORY</button>
                </div>
                <div class="chat-body" id="chatBody"></div>
                <!-- History Log Area -->
                <div id="historyLog" style="display:none; flex:1; overflow-y:auto; padding:15px; background:white; font-size:0.85rem; color:#1e293b;"></div>
                
                <form class="chat-input-area" id="chatForm">
                    <input type="text" class="chat-input" id="chatInput" placeholder="Ask me anything..." required autocomplete="off">
                    <button type="submit" class="chat-send-btn" style="background: #8b5cf6;"><i class="fas fa-paper-plane"></i></button>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', chatHtml);

    setTimeout(() => {
        const chatWindow = document.getElementById('chatWindow');
        const chatOpenBtn = document.getElementById('chatOpenBtn');
        const chatCloseBtn = document.getElementById('chatCloseBtn');
        const chatForm = document.getElementById('chatForm');
        const chatInput = document.getElementById('chatInput');
        const chatBody = document.getElementById('chatBody');
        const chatStatus = document.getElementById('chatStatus');
        const tabChat = document.getElementById('tabChat');
        const tabHistory = document.getElementById('tabHistory');
        const historyLog = document.getElementById('historyLog');
        const exportChatBtn = document.getElementById('exportChatBtn');
        const refreshChatBtn = document.getElementById('refreshChatBtn');
        const newChatBtn = document.getElementById('newChatBtn');

        // Check for API KEY
        let apiKey = localStorage.getItem('geminiApiKey');
        let chatHistory = JSON.parse(localStorage.getItem('geminiChatHistory')) || [];
        let uiHistory = JSON.parse(localStorage.getItem('geminiUiHistory')) || [];

        // UI toggles
        chatOpenBtn.style.opacity = '0';
        chatOpenBtn.style.transform = 'scale(0.8)';
        chatOpenBtn.style.transition = 'all 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) 1.5s';
        
        setTimeout(() => {
            chatOpenBtn.style.opacity = '1';
            chatOpenBtn.style.transform = 'scale(1)';
        }, 100);

        chatOpenBtn.addEventListener('click', () => {
            chatWindow.style.transform = 'scale(1) translateY(0)';
            chatWindow.style.opacity = '1';
            chatWindow.style.pointerEvents = 'all';
            chatOpenBtn.style.display = window.innerWidth <= 480 ? 'none' : 'flex';
        });

        chatCloseBtn.addEventListener('click', () => {
            chatWindow.style.transform = 'scale(0.9) translateY(20px)';
            chatWindow.style.opacity = '0';
            chatWindow.style.pointerEvents = 'none';
            chatOpenBtn.style.display = 'flex';
        });

        // Tab Switching Logic
        tabChat.addEventListener('click', () => {
            chatBody.style.display = 'block';
            historyLog.style.display = 'none';
            chatForm.style.display = 'flex';
            tabChat.style.color = '#8b5cf6';
            tabChat.style.borderBottomColor = '#8b5cf6';
            tabHistory.style.color = '#64748b';
            tabHistory.style.borderBottomColor = 'transparent';
        });

        tabHistory.addEventListener('click', () => {
            chatBody.style.display = 'none';
            historyLog.style.display = 'block';
            chatForm.style.display = 'none';
            tabHistory.style.color = '#8b5cf6';
            tabHistory.style.borderBottomColor = '#8b5cf6';
            tabChat.style.color = '#64748b';
            tabChat.style.borderBottomColor = 'transparent';
            renderFullHistory();
        });

        function renderFullHistory() {
            if (uiHistory.length === 0) {
                historyLog.innerHTML = `<div style="text-align:center; padding:50px 0; color:#94a3b8; font-style:italic;">No recorded history available.</div>`;
                return;
            }
            let html = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <div style="font-weight:800; font-size:0.7rem; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Saved Logs</div>
                    <button id="clearHistoryBtn" style="background:#fee2e2; color:#ef4444; border:none; padding:4px 10px; border-radius:12px; font-size:0.65rem; font-weight:700; cursor:pointer;">CLEAR ALL</button>
                </div>
                <div style="border-left:2px solid #e2e8f0; margin-left:10px; padding-left:20px;">`;
            let lastDate = "";
            uiHistory.forEach(msg => {
                const dateObj = new Date(msg.time || Date.now());
                const msgDate = dateObj.toLocaleDateString();
                const msgTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                if (msgDate !== lastDate) {
                    html += `<div style="margin:20px 0 10px -32px; background:#f8fafc; display:inline-block; padding:3px 12px; border-radius:12px; border:1px solid #e2e8f0; font-size:0.7rem; font-weight:800; color:#64748b;">${msgDate}</div>`;
                    lastDate = msgDate;
                }
                
                html += `
                    <div style="margin-bottom:15px; position:relative;">
                        <div style="font-weight:800; font-size:0.75rem; color:${msg.sender === 'bot' ? '#8b5cf6' : '#64748b'}; text-transform:uppercase;">${msg.sender === 'bot' ? 'Agent' : 'You'} <span style="font-weight:400; font-size:0.65rem; opacity:0.6; margin-left:5px;">${msgTime}</span></div>
                        <div style="line-height:1.5;">${msg.text}</div>
                    </div>
                `;
            });
            html += `</div>`;
            historyLog.innerHTML = html;

            document.getElementById('clearHistoryBtn').addEventListener('click', () => {
                if(confirm("Are you sure you want to permanently delete all chat history?")) {
                    localStorage.removeItem('geminiChatHistory');
                    localStorage.removeItem('geminiUiHistory');
                    chatHistory = [];
                    uiHistory = [];
                    chatBody.innerHTML = '';
                    renderFullHistory();
                    initChat();
                }
            });
        }

        exportChatBtn.addEventListener('click', () => {
            if (uiHistory.length === 0) return alert("Nothing to export yet!");
            let content = "--- NOVATECH AI AGENT CHAT LOG ---\n\n";
            uiHistory.forEach(msg => {
                const timeStr = new Date(msg.time || Date.now()).toLocaleString();
                content += `[${timeStr}] ${msg.sender.toUpperCase()}: ${msg.text}\n\n`;
            });
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `NovaTech_Chat_History_${new Date().toISOString().split('T')[0]}.txt`;
            a.click();
        });

        refreshChatBtn.addEventListener('click', () => {
            chatBody.innerHTML = '';
            initChat();
        });

        newChatBtn.addEventListener('click', () => {
            if(confirm("Start a new chat? Your current history will be cleared.")) {
                localStorage.removeItem('geminiChatHistory');
                localStorage.removeItem('geminiUiHistory');
                chatHistory = [];
                uiHistory = [];
                chatBody.innerHTML = '';
                initChat();
            }
        });

        // Initialize Chat
        function initChat() {
            if (!apiKey) {
                appendMessage("Welcome! I am the **NOVATECH AI Agent** powered by a true LLM backend.<br><br>Since there is no server for this project, I run entirely in your browser.<br><br>Please paste a free **Gemini API Key** to activate my brain. Get it from <a href='https://aistudio.google.com/app/apikey' target='_blank' style='color:#3b82f6;'>Google AI Studio</a>.", 'bot', true);
                chatStatus.innerHTML = '<div style="width:6px; height:6px; border-radius:50%; background:#ef4444;"></div> Waiting for Key';
            } else {
                chatStatus.innerHTML = '<div style="width:6px; height:6px; border-radius:50%; background:#10b981;"></div> Linked to Gemini';
                if (uiHistory.length === 0) {
                    renderDateDivider(Date.now());
                    appendMessage("Hello! I'm your activated NOVATECH AI Agent. What can I help you find today?", 'bot', true);
                } else {
                    let lastDate = "";
                    uiHistory.forEach(msg => {
                        const msgDate = new Date(msg.time || Date.now()).toLocaleDateString();
                        if (msgDate !== lastDate) {
                            renderDateDivider(msg.time || Date.now());
                            lastDate = msgDate;
                        }
                        appendMessage(msg.text, msg.sender, true, msg.time);
                    });
                }
            }
        }

        initChat();

        // Form Submit
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userText = chatInput.value.trim();
            if (!userText) return;

            appendMessage(userText, 'user');
            chatInput.value = '';

            // Key setup mode
            if (!apiKey) {
                if (userText.startsWith('AIza')) {
                    apiKey = userText;
                    localStorage.setItem('geminiApiKey', apiKey);
                    appendMessage("✅ **API Key Validated & Saved Securely**!<br>My neural networks are online and I can see the store's inventory. What would you like to ask?", 'bot', true);
                    chatStatus.innerHTML = '<div style="width:6px; height:6px; border-radius:50%; background:#10b981;"></div> Linked to Gemini';
                } else {
                    appendMessage("That doesn't look like a valid Google API key (starts with AIza). Please check again.", 'bot', true);
                }
                return;
            }

            // Commands
            if (userText.toLowerCase() === '/reset') {
                localStorage.removeItem('geminiApiKey');
                localStorage.removeItem('geminiValidModel');
                localStorage.removeItem('geminiChatHistory');
                localStorage.removeItem('geminiUiHistory');
                apiKey = null;
                chatHistory = [];
                uiHistory = [];
                chatBody.innerHTML = '';
                appendMessage("API Key removed. Visualizing memories... gone. Brain disconnected.", 'bot', true);
                chatStatus.innerHTML = '<div style="width:6px; height:6px; border-radius:50%; background:#ef4444;"></div> Waiting for Key';
                return;
            }

            const typingId = showTypingIndicator();

            try {
                const response = await fetchGeminiResponse(userText);
                removeTypingIndicator(typingId);
                appendMessage(response, 'bot');
            } catch (error) {
                removeTypingIndicator(typingId);
                console.error("AI Error:", error);
                if (error.message.includes('API key')) {
                    appendMessage("Error: Your API key seems invalid or expired. Type **/reset** and try providing a new one.", 'bot', true);
                } else {
                    appendMessage("Oops, my neural network experienced a hiccup. Please try again! (" + error.message + ")", 'bot', true);
                }
            }
        });

        function appendMessage(text, sender, skipSave = false, time = null) {
            const now = time || Date.now();
            if (!skipSave) {
                uiHistory.push({ text, sender, time: now });
                // Keep UI history trimmed for speed but larger enough for records
                if (uiHistory.length > 100) uiHistory.splice(0, uiHistory.length - 100);
                localStorage.setItem('geminiUiHistory', JSON.stringify(uiHistory));

                // Auto-add date divider if it's a new day from the last message in UI
                const lastMsg = uiHistory[uiHistory.length - 2];
                const lastDate = lastMsg ? new Date(lastMsg.time).toLocaleDateString() : "";
                const currDate = new Date(now).toLocaleDateString();
                if (currDate !== lastDate) {
                    renderDateDivider(now);
                }
            }

            const msgDiv = document.createElement('div');
            msgDiv.className = `chat-msg msg-${sender}`;

            // Basic markdown parser
            let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // bold
            formattedText = formattedText.replace(/(^|<br>)\* /g, '$1&bull; '); // bullet points
            formattedText = formattedText.replace(/\n\n/g, '<br><br>'); // paragraphs
            formattedText = formattedText.replace(/\n/g, '<br>'); // breaks
            formattedText = formattedText.replace(/`(.*?)`/g, '<code style="background:rgba(0,0,0,0.05); padding:2px 4px; border-radius:4px;">$1</code>'); // code

            msgDiv.innerHTML = formattedText;
            
            // Add Timestamp inside bubble using new CSS class
            const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const timeEl = document.createElement('span');
            timeEl.className = "chat-timestamp";
            timeEl.innerText = timeStr;
            msgDiv.appendChild(timeEl);

            chatBody.appendChild(msgDiv);
            scrollToBottom();
        }

        function renderDateDivider(timestamp) {
            const date = new Date(timestamp);
            const today = new Date().toLocaleDateString();
            const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
            let label = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

            if (date.toLocaleDateString() === today) label = "Today";
            else if (date.toLocaleDateString() === yesterday) label = "Yesterday";

            const div = document.createElement('div');
            div.className = "date-divider";
            div.style.cssText = "text-align:center; margin: 25px 0 15px 0; display:flex; align-items:center; gap:12px; width:100%; clear:both;";
            div.innerHTML = `
                <div style="flex:1; height:1px; background:rgba(0,0,0,0.15);"></div>
                <span style="font-size:0.65rem; color: #1e293b; text-transform:uppercase; letter-spacing:1.5px; font-weight:800; background: #e2e8f0; padding: 4px 12px; border-radius: 50px; border: 1px solid rgba(0,0,0,0.1);">${label}</span>
                <div style="flex:1; height:1px; background:rgba(0,0,0,0.15);"></div>
            `;
            chatBody.appendChild(div);
        }

        function showTypingIndicator() {
            const id = 'typing-' + Date.now();
            const div = document.createElement('div');
            div.id = id;
            div.className = 'chat-msg msg-bot';
            div.innerHTML = `
                <div class="typing-indicator">
                    <div class="typing-dot" style="background:#8b5cf6;"></div>
                    <div class="typing-dot" style="background:#8b5cf6;"></div>
                    <div class="typing-dot" style="background:#8b5cf6;"></div>
                </div>
            `;
            chatBody.appendChild(div);
            scrollToBottom();
            return id;
        }

        function removeTypingIndicator(id) {
            const el = document.getElementById(id);
            if (el) el.remove();
        }

        function scrollToBottom() {
            chatBody.scrollTop = chatBody.scrollHeight;
        }

        // Fetch Live Response from Google Gemini API
        async function fetchGeminiResponse(prompt) {
            let contextText = "You are the advanced AI shopping assistant for 'NOVATECH', a premium electronics store. Be extremely concise, polite, helpful, and professional. Always immediately answer the user's specific query.\n\n";

            let products = [];
            try {
                products = JSON.parse(localStorage.getItem('products')) || window.appProducts || [];
            } catch (e) { }

            if (products && products.length > 0) {
                contextText += "Our current live inventory contains:\n";
                const sampleProducts = products.map(p => {
                    let mrp = parseFloat(p.price);
                    let disp = parseFloat(p.discount) || 0;
                    let finalP = disp ? Math.round(mrp - (mrp * disp / 100)) : mrp;
                    return `- ${p.name} (Original MRP: ₹${mrp}, Discount: ${disp}%, Final Price: ₹${finalP}) in category: ${p.category}`;
                });
                contextText += sampleProducts.join("\n");
                contextText += "\n\nCRITICAL RULE: When a user asks for products, YOU MUST EXPLICITLY LIST ALL matching products from the entire inventory. For each product, clearly highlight its 'Original MRP' and the 'Final Price' after discount! Do not leave out matches.";
            }

            // --- Deep E-commerce AI Integration ---
            try {
                if (typeof firebase !== 'undefined' && firebase.auth().currentUser) {
                    const user = firebase.auth().currentUser;
                    contextText += `\n\n[USER CONTEXT]\nYou are currently talking to an authenticated user: ${user.email}.`;

                    // Inject Active Cart
                    let cart = JSON.parse(localStorage.getItem('cart')) || [];
                    if (cart.length > 0) {
                        let totalCart = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                        contextText += `\nThey currently have ${cart.length} item(s) in their cart: ` + cart.map(c => `${c.quantity}x ${c.name}`).join(", ") + `. Total Cart Value: ₹${totalCart}.`;
                    } else {
                        contextText += `\nTheir shopping cart is currently empty.`;
                    }

                    // Inject Live Firebase Orders
                    if (typeof db !== 'undefined') {
                        const snapshot = await db.collection('orders').where('userId', '==', user.uid).get();
                        if (!snapshot.empty) {
                            let userOrders = snapshot.docs.map(d => d.data());
                            userOrders.sort((a, b) => (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0) - (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0));

                            contextText += `\nRecent Orders for this user:\n`;
                            userOrders.slice(0, 5).forEach(o => {
                                const items = o.items ? o.items.map(i => i.name).join(", ") : "Unknown Items";
                                contextText += ` - Order ID: #${o.id} | Status: ${o.status || 'Placed'} | Tracking ID: ${o.trackingId || 'Pending Info'} | Total: ₹${o.totalAmount} | Items: ${items}\n`;
                            });
                            contextText += `If the user asks 'where is my order' or mentions an order, explicitly read the Tracking ID and Status above! Tell them exactly what the state is.`;
                        } else {
                            contextText += `\nThis user has no past orders.`;
                        }
                    }
                } else {
                    contextText += `\n\n[USER CONTEXT]\nThe user is currently browsing as an anonymous Guest.`;
                }
            } catch (e) {
                console.error("AI Context Bridge Error:", e);
            }
            // --------------------------------------

            chatHistory.push({ role: "user", parts: [{ text: prompt }] });

            const payload = {
                systemInstruction: { parts: [{ text: contextText }] },
                contents: chatHistory,
                generationConfig: {
                    temperature: 0.5,
                    maxOutputTokens: 1000
                }
            };

            let targetModel = 'gemini-2.5-flash';
            let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const finalError = await response.json().catch(() => ({ error: { message: "API request failed" } }));
                throw new Error(finalError.error?.message || "Unknown error");
            }

            let data;
            try {
                data = await response.clone().json();
            } catch (e) {
                data = await response.json();
            }

            const aiText = data.candidates[0].content.parts[0].text;
            chatHistory.push({ role: "model", parts: [{ text: aiText }] });

            // Massively expanded memory: Keep last 40 segments (20 conversation rounds)
            if (chatHistory.length > 40) {
                chatHistory.splice(0, 2);
            }
            localStorage.setItem('geminiChatHistory', JSON.stringify(chatHistory));

            return aiText;
        }

    }, 100);
});
