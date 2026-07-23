const ClassroomUI = {
    containerId: 'classroom-overlay',
    active: false,
    currentArticleIndex: 0,

    init: function () {
        // Create the container if it doesn't exist
        let container = document.getElementById(this.containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = this.containerId;
            document.body.appendChild(container);

            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                #classroom-overlay {
                    position: fixed;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(5, 10, 15, 0.95);
                    z-index: 20000;
                    display: none;
                    flex-direction: column;
                    color: #fff;
                    font-family: 'Courier New', Courier, monospace;
                    backdrop-filter: blur(10px);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                #classroom-overlay.active {
                    display: flex;
                    opacity: 1;
                }
                #classroom-header {
                    padding: 20px 40px;
                    border-bottom: 1px solid rgba(0, 255, 204, 0.3);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: linear-gradient(to bottom, rgba(0, 255, 204, 0.1), transparent);
                }
                #classroom-header h1 {
                    margin: 0;
                    font-size: 24px;
                    color: #00ffcc;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                }
                #classroom-close {
                    cursor: pointer;
                    color: #ef4444;
                    font-size: 16px;
                    font-weight: bold;
                    letter-spacing: 2px;
                    transition: all 0.2s;
                    border: 1px solid #ef4444;
                    padding: 5px 15px;
                    border-radius: 4px;
                }
                #classroom-close:hover {
                    background: rgba(239, 68, 68, 0.2);
                    box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
                }
                #classroom-body {
                    display: flex;
                    flex-grow: 1;
                    overflow: hidden;
                }
                #classroom-sidebar {
                    width: 300px;
                    border-right: 1px solid rgba(0, 255, 204, 0.2);
                    padding: 20px;
                    overflow-y: auto;
                    background: rgba(0, 0, 0, 0.5);
                }
                .classroom-article-btn {
                    padding: 15px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    margin-bottom: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: rgba(255, 255, 255, 0.05);
                }
                .classroom-article-btn:hover {
                    background: rgba(0, 255, 204, 0.1);
                    border-color: rgba(0, 255, 204, 0.5);
                }
                .classroom-article-btn.active {
                    background: rgba(0, 255, 204, 0.2);
                    border-color: #00ffcc;
                    box-shadow: inset 0 0 10px rgba(0, 255, 204, 0.2);
                }
                .classroom-article-title {
                    font-size: 14px;
                    font-weight: bold;
                    color: #fff;
                    margin-bottom: 5px;
                    line-height: 1.4;
                }
                .classroom-article-meta {
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.5);
                }
                #classroom-content {
                    flex-grow: 1;
                    padding: 40px 80px;
                    overflow-y: auto;
                    line-height: 1.8;
                    font-size: 16px;
                    color: #e2e8f0;
                    scrollbar-width: thin;
                    scrollbar-color: #00ffcc transparent;
                }
                #classroom-content h1 { font-size: 32px; color: #00ffcc; margin-bottom: 10px; line-height: 1.2; }
                #classroom-content h2 { font-size: 24px; color: #fff; border-bottom: 1px dashed rgba(255,255,255,0.2); padding-bottom: 5px; margin-top: 40px; margin-bottom: 20px; }
                #classroom-content h3 { font-size: 18px; color: #94a3b8; margin-top: 30px; margin-bottom: 15px; }
                #classroom-content p { margin-bottom: 20px; }
                #classroom-content ul { margin-bottom: 20px; padding-left: 20px; }
                #classroom-content li { margin-bottom: 10px; }
                
                .table-container {
                    overflow-x: auto;
                    margin: 30px 0;
                    border: 1px solid rgba(0, 255, 204, 0.3);
                    background: rgba(0, 0, 0, 0.5);
                }
                #classroom-content table {
                    width: 100%;
                    border-collapse: collapse;
                }
                #classroom-content th, #classroom-content td {
                    padding: 12px 15px;
                    text-align: left;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    font-size: 14px;
                }
                #classroom-content th {
                    background: rgba(0, 255, 204, 0.1);
                    color: #00ffcc;
                    font-weight: bold;
                    text-transform: uppercase;
                }
                #classroom-content tr:last-child td { border-bottom: none; }
                #classroom-content tr:hover td { background: rgba(255, 255, 255, 0.05); }
                
                #classroom-content::-webkit-scrollbar { width: 8px; }
                #classroom-content::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
                #classroom-content::-webkit-scrollbar-thumb { background: #00ffcc; border-radius: 4px; }
            `;
            document.head.appendChild(style);

            container.innerHTML = `
                <div id="classroom-header">
                    <h1>TECHNICAL CLASSROOM // ARCHIVE</h1>
                    <div id="classroom-close">[ CLOSE ]</div>
                </div>
                <div id="classroom-body">
                    <div id="classroom-sidebar"></div>
                    <div id="classroom-content"></div>
                </div>
            `;

            document.getElementById('classroom-close').addEventListener('click', () => {
                this.hide();
            });
        }
    },

    renderSidebar: function () {
        const sidebar = document.getElementById('classroom-sidebar');
        sidebar.innerHTML = '';

        ClassroomData.articles.forEach((article, index) => {
            const btn = document.createElement('div');
            btn.className = 'classroom-article-btn' + (index === this.currentArticleIndex ? ' active' : '');
            btn.innerHTML = `
                <div class="classroom-article-title">${article.title}</div>
                <div class="classroom-article-meta">${article.category} // ${article.date}</div>
            `;
            btn.addEventListener('click', () => {
                this.currentArticleIndex = index;
                this.renderSidebar();
                this.renderContent();
                if (window.SFX) window.SFX.triggerUI();
            });
            sidebar.appendChild(btn);
        });
    },

    renderContent: function () {
        const content = document.getElementById('classroom-content');
        const article = ClassroomData.articles[this.currentArticleIndex];
        
        if (article) {
            content.innerHTML = `
                <h1>${article.title}</h1>
                <div style="color: rgba(255,255,255,0.4); margin-bottom: 40px; font-size: 14px; text-transform: uppercase;">
                    LOG ENTRY: ${article.date} // CATEGORY: ${article.category}
                </div>
                ${article.content}
            `;
            content.scrollTop = 0;
        }
    },

    show: function () {
        this.init();
        this.renderSidebar();
        this.renderContent();
        
        const container = document.getElementById(this.containerId);
        container.style.display = 'flex';
        // Small delay to allow CSS transition
        setTimeout(() => {
            container.classList.add('active');
        }, 10);
        this.active = true;
    },

    hide: function () {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.classList.remove('active');
            setTimeout(() => {
                container.style.display = 'none';
                this.active = false;
            }, 300); // Wait for transition
        }
    }
};
