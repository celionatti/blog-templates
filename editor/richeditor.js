(function(global) {
    'use strict';

    const RichEditor = function(selector, options) {
        if (!(this instanceof RichEditor)) {
            return new RichEditor(selector, options);
        }

        this.container = typeof selector === 'string' 
            ? document.querySelector(selector) 
            : selector;

        if (!this.container) {
            throw new Error('RichEditor: Container element not found');
        }

        this.options = Object.assign({
            height: '400px',
            placeholder: 'Start typing...',
            toolbar: [
                ['undo', 'redo'],
                ['heading', 'fontName', 'fontSize'],
                ['bold', 'italic', 'underline', 'strikethrough'],
                ['foreColor', 'hiliteColor'],
                ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify'],
                ['unorderedList', 'orderedList', 'outdent', 'indent'],
                ['link', 'image', 'table'],
                ['removeFormat', 'code', 'fullscreen']
            ],
            theme: 'default',
            onChange: null,
            onFocus: null,
            onBlur: null
        }, options);

        this.isFullscreen = false;

        this.init();
    };

    RichEditor.prototype = {
        init: function() {
            this.createEditor();
            this.attachEvents();
            this.updateToolbarState();
        },

        createEditor: function() {
            const wrapper = document.createElement('div');
            wrapper.className = 'richeditor-wrapper';
            if (this.options.theme !== 'default') {
                wrapper.classList.add('theme-' + this.options.theme);
            }
            wrapper.style.height = this.options.height;

            const toolbar = this.createToolbar();
            const content = document.createElement('div');
            content.className = 'richeditor-content';
            content.contentEditable = true;
            content.setAttribute('data-placeholder', this.options.placeholder);

            wrapper.appendChild(toolbar);
            wrapper.appendChild(content);

            this.container.innerHTML = '';
            this.container.appendChild(wrapper);

            this.wrapper = wrapper;
            this.toolbar = toolbar;
            this.content = content;

            this.createModals();
        },

        createToolbar: function() {
            const toolbar = document.createElement('div');
            toolbar.className = 'richeditor-toolbar';

            this.options.toolbar.forEach(group => {
                const groupEl = document.createElement('div');
                groupEl.className = 'richeditor-toolbar-group';

                group.forEach(cmd => {
                    const btn = this.createToolbarButton(cmd);
                    if (btn) groupEl.appendChild(btn);
                });

                toolbar.appendChild(groupEl);
            });

            return toolbar;
        },

        createToolbarButton: function(cmd) {
            const buttons = {
                'undo': { icon: '↶', title: 'Undo', action: () => this.exec('undo') },
                'redo': { icon: '↷', title: 'Redo', action: () => this.exec('redo') },
                'bold': { icon: 'B', title: 'Bold', style: 'font-weight:bold', action: () => this.exec('bold') },
                'italic': { icon: 'I', title: 'Italic', style: 'font-style:italic', action: () => this.exec('italic') },
                'underline': { icon: 'U', title: 'Underline', style: 'text-decoration:underline', action: () => this.exec('underline') },
                'strikethrough': { icon: 'S', title: 'Strikethrough', style: 'text-decoration:line-through', action: () => this.exec('strikeThrough') },
                'alignLeft': { icon: '≡', title: 'Align Left', action: () => this.exec('justifyLeft') },
                'alignCenter': { icon: '≣', title: 'Align Center', action: () => this.exec('justifyCenter') },
                'alignRight': { icon: '≡', title: 'Align Right', style: 'transform:scaleX(-1)', action: () => this.exec('justifyRight') },
                'alignJustify': { icon: '▤', title: 'Justify', action: () => this.exec('justifyFull') },
                'unorderedList': { icon: '⁃', title: 'Bullet List', action: () => this.exec('insertUnorderedList') },
                'orderedList': { icon: '#', title: 'Numbered List', action: () => this.exec('insertOrderedList') },
                'outdent': { icon: '◂', title: 'Decrease Indent', action: () => this.exec('outdent') },
                'indent': { icon: '▸', title: 'Increase Indent', action: () => this.exec('indent') },
                'link': { icon: '🔗', title: 'Insert Link', action: () => this.showLinkModal() },
                'image': { icon: '🖼', title: 'Insert Image', action: () => this.showImageModal() },
                'table': { icon: '⊞', title: 'Insert Table', action: () => this.showTableModal() },
                'removeFormat': { icon: '✕', title: 'Clear Format', action: () => this.exec('removeFormat') },
                'code': { icon: '<>', title: 'Code', action: () => this.exec('formatBlock', '<pre>') },
                'fullscreen': { icon: '⛶', title: 'Fullscreen', action: () => this.toggleFullscreen() }
            };

            if (cmd === 'heading') {
                return this.createSelect('heading', [
                    { value: '', text: 'Paragraph' },
                    { value: 'h1', text: 'Heading 1' },
                    { value: 'h2', text: 'Heading 2' },
                    { value: 'h3', text: 'Heading 3' },
                    { value: 'h4', text: 'Heading 4' }
                ], (val) => this.exec('formatBlock', val));
            }

            if (cmd === 'fontName') {
                return this.createSelect('fontName', [
                    { value: '', text: 'Font' },
                    { value: 'Arial', text: 'Arial' },
                    { value: 'Georgia', text: 'Georgia' },
                    { value: 'Verdana', text: 'Verdana' }
                ], (val) => this.exec('fontName', val));
            }

            if (cmd === 'fontSize') {
                return this.createSelect('fontSize', [
                    { value: '', text: 'Size' },
                    { value: '1', text: 'Small' },
                    { value: '3', text: 'Normal' },
                    { value: '5', text: 'Large' }
                ], (val) => this.exec('fontSize', val));
            }

            if (cmd === 'foreColor') {
                return this.createColorInput('Text Color', (color) => this.exec('foreColor', color));
            }

            if (cmd === 'hiliteColor') {
                return this.createColorInput('Highlight', (color) => this.exec('hiliteColor', color));
            }

            if (buttons[cmd]) {
                const btn = document.createElement('button');
                btn.className = 'richeditor-btn';
                btn.innerHTML = buttons[cmd].icon;
                btn.title = buttons[cmd].title;
                if (buttons[cmd].style) btn.style.cssText = buttons[cmd].style;
                btn.onclick = (e) => {
                    e.preventDefault();
                    buttons[cmd].action();
                };
                btn.dataset.command = cmd;
                return btn;
            }

            return null;
        },

        createSelect: function(name, options, onChange) {
            const select = document.createElement('select');
            select.className = 'richeditor-select';
            
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.text;
                select.appendChild(option);
            });

            select.onchange = (e) => {
                if (e.target.value) {
                    onChange(e.target.value);
                    e.target.value = '';
                }
            };

            return select;
        },

        createColorInput: function(title, onChange) {
            const input = document.createElement('input');
            input.type = 'color';
            input.className = 'richeditor-color-input';
            input.title = title;
            input.onchange = (e) => onChange(e.target.value);
            return input;
        },

        createModals: function() {
            const linkModal = this.createModal('link', 'Insert Link', `
                <input type="text" id="richeditor-link-text" placeholder="Link Text" />
                <input type="url" id="richeditor-link-url" placeholder="https://example.com" />
            `, () => this.insertLink());

            const imageModal = this.createModal('image', 'Insert Image', `
                <input type="url" id="richeditor-image-url" placeholder="https://example.com/image.jpg" />
            `, () => this.insertImage());

            const tableModal = this.createModal('table', 'Insert Table', `
                <input type="number" id="richeditor-table-rows" placeholder="Rows" min="1" value="3" />
                <input type="number" id="richeditor-table-cols" placeholder="Columns" min="1" value="3" />
            `, () => this.insertTable());

            document.body.appendChild(linkModal);
            document.body.appendChild(imageModal);
            document.body.appendChild(tableModal);

            this.modals = { link: linkModal, image: imageModal, table: tableModal };
        },

        createModal: function(id, title, content, onInsert) {
            const modal = document.createElement('div');
            modal.className = 'richeditor-modal';
            modal.id = 'richeditor-modal-' + id;
            modal.innerHTML = `
                <div class="richeditor-modal-content">
                    <h3>${title}</h3>
                    ${content}
                    <div class="richeditor-modal-actions">
                        <button class="richeditor-modal-btn secondary">Cancel</button>
                        <button class="richeditor-modal-btn primary">Insert</button>
                    </div>
                </div>
            `;

            const buttons = modal.querySelectorAll('.richeditor-modal-btn');
            buttons[0].onclick = () => this.closeModal(id);
            buttons[1].onclick = () => {
                onInsert();
                this.closeModal(id);
            };

            modal.onclick = (e) => {
                if (e.target === modal) this.closeModal(id);
            };

            return modal;
        },

        exec: function(cmd, value = null) {
            document.execCommand(cmd, false, value);
            this.content.focus();
            this.updateToolbarState();
        },

        showLinkModal: function() {
            const selection = window.getSelection();
            const text = selection.toString();
            if (text) {
                document.getElementById('richeditor-link-text').value = text;
            }
            this.modals.link.classList.add('active');
        },

        insertLink: function() {
            const text = document.getElementById('richeditor-link-text').value;
            const url = document.getElementById('richeditor-link-url').value;
            
            if (url) {
                if (text) {
                    this.exec('insertHTML', `<a href="${url}" target="_blank">${text}</a>`);
                } else {
                    this.exec('createLink', url);
                }
            }
            
            document.getElementById('richeditor-link-text').value = '';
            document.getElementById('richeditor-link-url').value = '';
        },

        showImageModal: function() {
            this.modals.image.classList.add('active');
        },

        insertImage: function() {
            const url = document.getElementById('richeditor-image-url').value;
            
            if (url) {
                this.exec('insertHTML', `<img src="${url}" style="max-width:100%;" />`);
            }
            
            document.getElementById('richeditor-image-url').value = '';
        },

        showTableModal: function() {
            this.modals.table.classList.add('active');
        },

        insertTable: function() {
            const rows = parseInt(document.getElementById('richeditor-table-rows').value) || 3;
            const cols = parseInt(document.getElementById('richeditor-table-cols').value) || 3;
            
            let html = '<table border="1" style="border-collapse:collapse;width:100%;"><tbody>';
            for (let i = 0; i < rows; i++) {
                html += '<tr>';
                for (let j = 0; j < cols; j++) {
                    html += '<td style="padding:8px;border:1px solid #ddd;">&nbsp;</td>';
                }
                html += '</tr>';
            }
            html += '</tbody></table><p><br></p>';
            
            this.exec('insertHTML', html);
        },

        closeModal: function(id) {
            this.modals[id].classList.remove('active');
        },

        toggleFullscreen: function() {
            this.isFullscreen = !this.isFullscreen;
            this.wrapper.classList.toggle('fullscreen');
            
            if (this.isFullscreen) {
                this.wrapper.style.height = '100vh';
            } else {
                this.wrapper.style.height = this.options.height;
            }
        },

        updateToolbarState: function() {
            const commands = ['bold', 'italic', 'underline', 'strikethrough'];
            
            commands.forEach(cmd => {
                const btn = this.toolbar.querySelector(`[data-command="${cmd}"]`);
                if (btn) {
                    if (document.queryCommandState(cmd)) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                }
            });
        },

        attachEvents: function() {
            const self = this;

            this.content.addEventListener('input', function() {
                if (self.options.onChange) {
                    self.options.onChange(self.getContent());
                }
                self.updateToolbarState();
            });

            this.content.addEventListener('focus', function() {
                if (self.options.onFocus) {
                    self.options.onFocus();
                }
            });

            this.content.addEventListener('blur', function() {
                if (self.options.onBlur) {
                    self.options.onBlur();
                }
            });

            document.addEventListener('selectionchange', function() {
                self.updateToolbarState();
            });
        },

        // Public API Methods
        getContent: function(format) {
            if (format === 'text') {
                return this.content.innerText;
            }
            return this.content.innerHTML;
        },

        setContent: function(html) {
            this.content.innerHTML = html;
        },

        clear: function() {
            this.content.innerHTML = '';
        },

        focus: function() {
            this.content.focus();
        },

        destroy: function() {
            this.container.innerHTML = '';
        },

        disable: function() {
            this.content.contentEditable = false;
            this.toolbar.style.pointerEvents = 'none';
            this.toolbar.style.opacity = '0.5';
        },

        enable: function() {
            this.content.contentEditable = true;
            this.toolbar.style.pointerEvents = 'auto';
            this.toolbar.style.opacity = '1';
        }
    };

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = RichEditor;
    } else if (typeof define === 'function' && define.amd) {
        define(function() { return RichEditor; });
    } else {
        global.RichEditor = RichEditor;
    }

})(typeof window !== 'undefined' ? window : this);