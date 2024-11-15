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

// 添加格式化AI回复的函数
function formatAIResponse(response) {
    // 添加换行
    response = response.replace(/\n/g, '<br>');
    
    // 加粗重要信息
    response = response.replace(/【(.*?)】/g, '<strong>$1</strong>');
    
    // 添加重点标记
    response = response.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    return response;
}

// 添加CSS样式
const style = document.createElement('style');
style.textContent = `
    .typing-dots {
        display: inline-block;
        animation: typing 1s infinite;
    }
    
    @keyframes typing {
        0% { opacity: .2; }
        20% { opacity: 1; }
        100% { opacity: .2; }
    }
`;
document.head.appendChild(style);

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

// 修改导航栏滚动效果
let lastScrollTop = 0;
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // 移除向上滑动显示导航栏的效果
    navbar.style.top = '0';  // 保持导航栏始终在顶部
    
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

// Lightbox 功能
document.addEventListener('DOMContentLoaded', function() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeLightbox = document.querySelector('.close-lightbox');

    // 为所有可放大的图片添加点击事件
    document.querySelectorAll('.zoomable').forEach(img => {
        img.addEventListener('click', function(e) {
            e.preventDefault();
            lightbox.style.display = 'block';
            lightboxImg.src = this.src;
        });
    });

    // 点击关闭按钮关闭 lightbox
    closeLightbox.addEventListener('click', function() {
        lightbox.style.display = 'none';
    });

    // 点击背景关闭 lightbox
    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) {
            lightbox.style.display = 'none';
        }
    });

    // ESC 键关闭 lightbox
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && lightbox.style.display === 'block') {
            lightbox.style.display = 'none';
        }
    });
});

// 修改联系方式的动画触发
document.addEventListener('DOMContentLoaded', function() {
    const contactLink = document.querySelector('a[href="#contact-section"]');
    const contactTitle = document.querySelector('.contact-info h3');
    const contactIcons = document.querySelectorAll('.contact-info i');
    const contactTexts = document.querySelectorAll('.contact-text');
    const socialIcons = document.querySelectorAll('.social-links a i');

    // 触发所有动画的函数
    function triggerAllAnimations() {
        // 标题动画
        contactTitle.classList.remove('highlight-animation');
        void contactTitle.offsetWidth;
        contactTitle.classList.add('highlight-animation');

        // 联系方式图标和文本动画
        contactIcons.forEach((icon, index) => {
            setTimeout(() => {
                icon.classList.remove('icon-highlight');
                void icon.offsetWidth;
                icon.classList.add('icon-highlight');
            }, index * 100); // 添加延迟，使动画依次触发
        });

        // 联系方式文本动画
        contactTexts.forEach((text, index) => {
            setTimeout(() => {
                text.classList.remove('highlight-animation');
                void text.offsetWidth;
                text.classList.add('highlight-animation');
            }, index * 100); // 添加延迟，使动画依次触发
        });

        // 社交媒体图标动画
        socialIcons.forEach((icon, index) => {
            setTimeout(() => {
                icon.classList.remove('icon-highlight');
                void icon.offsetWidth;
                icon.classList.add('icon-highlight');
            }, index * 100); // 添加延迟，使动画依次触发
        });
    }

    // 点击导航链接时的处理
    contactLink.addEventListener('click', function(e) {
        e.preventDefault();
        
        // 平滑滚动到页脚
        document.querySelector('#contact-section').scrollIntoView({
            behavior: 'smooth'
        });

        // 等待滚动完成后触发动画
        setTimeout(triggerAllAnimations, 500); // 给滚动预留时间
    });

    // 为各元素添加独立的悬停效果
    contactIcons.forEach(icon => {
        icon.addEventListener('mouseenter', function() {
            if (!this.classList.contains('icon-highlight')) {
                this.classList.add('icon-highlight');
            }
        });
        icon.addEventListener('animationend', function() {
            this.classList.remove('icon-highlight');
        });
    });

    contactTexts.forEach(text => {
        text.addEventListener('mouseenter', function() {
            if (!this.classList.contains('highlight-animation')) {
                this.classList.add('highlight-animation');
            }
        });
        text.addEventListener('animationend', function() {
            this.classList.remove('highlight-animation');
        });
    });

    socialIcons.forEach(icon => {
        icon.addEventListener('mouseenter', function() {
            if (!this.classList.contains('icon-highlight')) {
                this.classList.add('icon-highlight');
            }
        });
        icon.addEventListener('animationend', function() {
            this.classList.remove('icon-highlight');
        });
    });
});

// 添加字数统计和回车发送功能
document.addEventListener('DOMContentLoaded', function() {
    const userInput = document.getElementById('userInput');
    const charCount = document.querySelector('.char-count');
    const sendButton = document.getElementById('sendMessage');

    // 更新字数统计
    function updateCharCount() {
        const length = userInput.value.length;
        charCount.textContent = `${length}/500`;
        // 如果超过限制，改变颜色提示
        if (length >= 500) {
            charCount.style.color = '#ff4444';
        } else {
            charCount.style.color = '#666';
        }
    }

    // 重置字数统计
    function resetCharCount() {
        charCount.textContent = '0/500';
        charCount.style.color = '#666';
    }

    // 监听输入事件
    userInput.addEventListener('input', updateCharCount);

    // 监听回车键发送
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {  // 按下Enter但不按Shift
            e.preventDefault();  // 阻止默认的换行行为
            if (userInput.value.trim()) {  // 确保输入不为空
                sendButton.click();  // 触发发送按钮的点击事件
                resetCharCount();    // 重置字数统计
            }
        }
    });

    // 监听发送按钮点击
    sendButton.addEventListener('click', function() {
        if (userInput.value.trim()) {
            // 发送消息的逻辑...
            resetCharCount();  // 重置字数统计
        }
    });

    // 初始化字数统计
    resetCharCount();
});
  