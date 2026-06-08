"use client";

import { useEffect, useRef, useState } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
  }, []);

  const handleInput = () => {
    try {
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    } catch (e) {
      console.error('RichTextEditor onInput error:', e);
    }
  };

  const execCommand = (command: string, value?: string) => {
    try {
      document.execCommand(command, false, value);
      if (editorRef.current) editorRef.current.focus();
      handleInput();
    } catch (e) {
      console.error('RichTextEditor execCommand error:', e);
    }
  };

  const handleImageUpload = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async e => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        // 上传到服务器
        const fd = new FormData();
        fd.append('file', file);
        try {
          const res = await fetch('/api/upload', { method: 'POST', body: fd });
          const data = await res.json();
          if (data.success) {
            const img = document.createElement('img');
            img.src = data.url;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            if (!editorRef.current) return;
            editorRef.current.focus();
            const selection = window.getSelection();
            if (selection?.rangeCount) {
              const range = selection.getRangeAt(0);
              range.insertNode(img);
              range.collapse(false);
            } else {
              editorRef.current.appendChild(img);
            }
            handleInput();
          } else {
            alert(data.error || '上传图片失败');
          }
        } catch (err) {
          alert('上传图片失败');
        }
      };
      input.click();
    } catch (e) {
      console.error('handleImageUpload error:', e);
    }
  };

  const handleFileUpload = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.ppt,.pptx,.pdf,.doc,.docx,.xls,.xlsx,.zip';
      input.onchange = async e => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        try {
          const res = await fetch('/api/upload', { method: 'POST', body: fd });
          const data = await res.json();
          if (data.success) {
            const link = document.createElement('a');
            link.href = data.url;
            link.textContent = '📎 ' + file.name;
            link.target = '_blank';
            link.className = 'text-blue-500 underline';
            if (!editorRef.current) return;
            editorRef.current.focus();
            const selection = window.getSelection();
            if (selection?.rangeCount) {
              const range = selection.getRangeAt(0);
              range.insertNode(link);
              // 插入换行
              const br = document.createElement('br');
              range.setStartAfter(link);
              range.insertNode(br);
              range.collapse(false);
            } else {
              editorRef.current.appendChild(link);
              editorRef.current.appendChild(document.createElement('br'));
            }
            handleInput();
          } else {
            alert(data.error || '上传文件失败');
          }
        } catch (err) {
          alert('上传文件失败');
        }
      };
      input.click();
    } catch (e) {
      console.error('handleFileUpload error:', e);
    }
  };

  const handleLink = () => {
    try {
      const url = window.prompt('请输入链接地址:');
      if (url) execCommand('createLink', url);
    } catch (e) {
      console.error('handleLink error:', e);
    }
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
      <div className="flex flex-wrap gap-1 p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
        <button type="button" onClick={() => execCommand('bold')} className="px-3 py-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-sm">B</button>
        <button type="button" onClick={() => execCommand('italic')} className="px-3 py-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 italic text-sm">I</button>
        <button type="button" onClick={() => execCommand('underline')} className="px-3 py-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 underline text-sm">U</button>
        <button type="button" onClick={() => execCommand('strikeThrough')} className="px-3 py-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 line-through text-sm">S</button>
        <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center" />
        <button type="button" onClick={() => execCommand('insertUnorderedList')} className="px-3 py-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-sm">•</button>
        <button type="button" onClick={() => execCommand('insertOrderedList')} className="px-3 py-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-sm">1.</button>
        <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center" />
        <button type="button" onClick={handleLink} className="px-3 py-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-sm">链接</button>
        <button type="button" onClick={handleImageUpload} className="px-3 py-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-sm">图片</button>
        <button type="button" onClick={handleFileUpload} className="px-3 py-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-sm" title="上传文件">📎</button>
        <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center" />
        <button type="button" onClick={() => execCommand('formatBlock', 'h2')} className="px-3 py-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-sm">标题</button>
        <button type="button" onClick={() => execCommand('formatBlock', 'p')} className="px-3 py-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-sm">段落</button>
        <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center" />
        <button type="button" onClick={() => execCommand('removeFormat')} className="px-3 py-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-sm">清除</button>
      </div>
      {mounted ? (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => { try { if (editorRef.current && !editorRef.current.innerHTML) editorRef.current.innerHTML = value || ''; } catch (e) {} }}
          onBlur={() => { try { handleInput(); } catch (e) {} }}
          onInput={handleInput}
          className="min-h-[200px] p-4 outline-none text-sm"
          data-placeholder={placeholder}
          style={{ minHeight: '200px' }}
        />
      ) : (
        <div className="min-h-[200px] p-4 text-sm text-slate-400">{placeholder}</div>
      )}
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
          display: block;
        }
        [contenteditable] img { max-width: 100%; height: auto; margin: 0.5em 0; border-radius: 0.5rem; }
        [contenteditable] a { color: #3b82f6; text-decoration: underline; }
        [contenteditable] ul, [contenteditable] ol { padding-left: 1.5em; margin: 0.5em 0; }
        [contenteditable] h2 { font-size: 1.25em; font-weight: bold; margin: 0.5em 0; }
        [contenteditable] p { margin: 0.3em 0; }
      `}</style>
    </div>
  );
}
