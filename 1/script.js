// 初始化轮播图
const swiper = new Swiper('.swiper', {
    loop: true,
    pagination: {
        el: '.swiper-pagination',
    },
    navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
    },
    autoplay: {
        delay: 5000,
    },
});

// AI聊天功能
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendMessage = document.getElementById('sendMessage');

// 监听发送按钮点击和回车事件
sendMessage.addEventListener('click', sendUserMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendUserMessage();
    }
});

// ChatAPI类保持不变
class ChatAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    }

    async generateToken() {
        try {
            const [id, secret] = this.apiKey.split('.');
            const now = Date.now();
            
            const header = {
                alg: 'HS256',
                sign_type: 'SIGN'
            };

            const payload = {
                api_key: id,
                exp: now + 3600 * 1000,
                timestamp: now
            };

            const sHeader = JSON.stringify(header);
            const sPayload = JSON.stringify(payload);
            const token = KJUR.jws.JWS.sign("HS256", sHeader, sPayload, secret);
            
            console.log('Token生成成功');
            return token;
        } catch (error) {
            console.error('Token生成错误:', error);
            throw new Error('Token生成失败: ' + error.message);
        }
    }

    async sendMessage(messages) {
        try {
            const token = await this.generateToken();
            console.log('发送请求到API，消息内容:', messages);

            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'glm-4',
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1500,
                    stream: false
                })
            });

            console.log('API响应状态:', response.status);

            if (!response.ok) {
                const errorData = await response.text();
                console.error('API错误响应:', errorData);
                throw new Error(`API错误: ${response.status} - ${errorData}`);
            }

            const data = await response.json();
            console.log('API响应数据:', data);
            return data;
        } catch (error) {
            console.error('API调用详细错误:', error);
            throw error;
        }
    }
}

// 初始化聊天API和历史记录
let chatHistory = [];
const chatAPI = new ChatAPI('15ba5caf6a8b06b375b2d21fb2f88a5a.oILD8SD8VQfoi6rg');

// 发送消息函数
async function sendUserMessage() {
    const message = userInput.value.trim();
    if (message) {
        try {
            // 添加用户消息到界面
            addMessage('user', message);
            userInput.value = '';

            // 添加系统提示消息
            const systemMessage = {
                role: 'system',
                content: '你是一个专业的教育咨询顾问，专门解答关于专转本考试、课程和培训的问题。请用简洁专业的语言回答用户的问题。'
            };

            // 构建消息历史
            const messages = [
                systemMessage,
                ...chatHistory,
                { role: 'user', content: message }
            ];

            // 显示加载状态
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'message ai-message loading';
            loadingDiv.textContent = '正在思考...';
            chatMessages.appendChild(loadingDiv);

            // 调用API
            const response = await chatAPI.sendMessage(messages);
            
            // 移除加载状态
            chatMessages.removeChild(loadingDiv);

            if (response && response.choices && response.choices[0] && response.choices[0].message) {
                const aiResponse = response.choices[0].message.content;
                addMessage('ai', aiResponse);
                chatHistory.push({ role: 'user', content: message });
                chatHistory.push({ role: 'assistant', content: aiResponse });
            } else {
                throw new Error('API响应格式不正确');
            }

        } catch (error) {
            console.error('发送消息错误:', error);
            addMessage('system', '抱歉，我暂时无法回答您的问题。请稍后再试或换个问题。错误信息：' + error.message);
        }

        // 滚动到底部
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// 修改添加消息的函数
function addMessage(type, content) {
    const messageDiv = document.createElement('div');
    
    // 根据消息类型设置不同的类名
    if (type === 'user') {
        messageDiv.className = 'message user-message';
    } else if (type === 'ai' || type === 'system') {
        messageDiv.className = 'message bot-message';
    }
    
    // 添加消息内容
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    messageDiv.appendChild(contentDiv);
    
    // 添加时间戳
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    timeDiv.textContent = `${hours}:${minutes}`;
    messageDiv.appendChild(timeDiv);
    
    // 添加到聊天区域
    chatMessages.appendChild(messageDiv);
    
    // 滚动到最新消息
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 导航栏滚动效果
let lastScrollTop = 0;
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > lastScrollTop) {
        navbar.style.top = '-80px';
    } else {
        navbar.style.top = '0';
    }
    lastScrollTop = scrollTop;
});

// 在文件末尾添加平滑滚动代码
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// 修改模态框相关代码
document.addEventListener('DOMContentLoaded', () => {
    // 服务体系弹窗控制
    const servicesModal = document.getElementById('servicesModal');
    const servicesBtn = document.getElementById('servicesBtn');
    const closeServices = document.getElementById('closeServices');
    
    if (servicesBtn) {
        servicesBtn.onclick = function(e) {
            e.preventDefault();
            if (servicesModal) {
                servicesModal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }
        };
    }

    if (closeServices) {
        closeServices.onclick = function() {
            servicesModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        };
    }

    // 立己简介弹窗控制
    const introModal = document.getElementById('introModal');
    const introBtn = document.getElementById('introBtn');
    const closeIntro = document.getElementById('closeIntro');
    
    if (introBtn) {
        introBtn.onclick = function(e) {
            e.preventDefault();
            if (introModal) {
                introModal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }
        };
    }

    if (closeIntro) {
        closeIntro.onclick = function() {
            introModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        };
    }

    // 点击模态框外部关闭
    window.onclick = function(event) {
        if (event.target === introModal) {
            introModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
        if (event.target === servicesModal) {
            servicesModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    };

    // ESC键关闭功能
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            if (introModal.style.display === 'block') {
                introModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
            if (servicesModal.style.display === 'block') {
                servicesModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        }
    });
}); 