'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import { 
  Bold, Italic, List, ListOrdered, Image as ImageIcon, 
  Youtube as YoutubeIcon, Undo, Redo, Heading1, Heading2, Loader2 
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

const MenuButton = ({ 
  onClick, 
  active, 
  children, 
  title,
  disabled
}: { 
  onClick: () => void; 
  active?: boolean; 
  children: React.ReactNode;
  title: string;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={`p-2 rounded-sm transition-colors disabled:opacity-50 ${
      active ? 'bg-charcoal text-white' : 'bg-hanji-white text-muted hover:bg-deep-sage/10'
    }`}
  >
    {children}
  </button>
);

export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-sm shadow-md my-4',
        },
      }),
      Youtube.configure({
        width: 840,
        height: 480,
        HTMLAttributes: {
          class: 'aspect-video w-full h-auto rounded-sm my-8',
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none prose prose-slate max-w-none min-h-[300px] p-6 text-sm font-light leading-relaxed',
      },
    },
  });

  // 외부에서 value가 변경될 때 에디터 내용 동기화 (초기 로딩 시 필수)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `content/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      editor.chain().focus().setImage({ src: publicUrl }).run();
    } catch (err) {
      console.error('Editor image upload failed:', err);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addYoutube = () => {
    const url = window.prompt('유튜브 영상 URL을 입력하세요:');
    if (url) {
      editor.commands.setYoutubeVideo({ src: url });
    }
  };

  return (
    <div className="border border-border-light rounded-sm overflow-hidden bg-white shadow-inner relative">
      {/* Upload Overlay */}
      {isUploading && (
        <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
          <div className="bg-white p-4 rounded-sm shadow-xl flex items-center gap-3 border border-border-light">
            <Loader2 className="w-5 h-5 animate-spin text-deep-sage" />
            <span className="text-xs font-bold text-charcoal uppercase tracking-widest">Uploading Image...</span>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        className="hidden" 
      />

      {/* Toolbar */}
      <div className="bg-hanji-white/50 border-b border-border-light p-2 flex flex-wrap gap-1">
        <MenuButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
          active={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </MenuButton>
        <div className="w-px h-6 bg-border-light mx-1 my-auto" />
        <MenuButton 
          onClick={() => editor.chain().focus().toggleBold().run()} 
          active={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleItalic().run()} 
          active={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </MenuButton>
        <div className="w-px h-6 bg-border-light mx-1 my-auto" />
        <MenuButton 
          onClick={() => editor.chain().focus().toggleBulletList().run()} 
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleOrderedList().run()} 
          active={editor.isActive('orderedList')}
          title="Ordered List"
        >
          <ListOrdered className="w-4 h-4" />
        </MenuButton>
        <div className="w-px h-6 bg-border-light mx-1 my-auto" />
        <MenuButton 
          onClick={() => fileInputRef.current?.click()} 
          title="Upload Local Image"
          disabled={isUploading}
        >
          <ImageIcon className="w-4 h-4" />
        </MenuButton>
        <MenuButton onClick={addYoutube} title="Add Youtube Video">
          <YoutubeIcon className="w-4 h-4" />
        </MenuButton>
        <div className="flex-1" />
        <MenuButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo className="w-4 h-4" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo className="w-4 h-4" />
        </MenuButton>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
