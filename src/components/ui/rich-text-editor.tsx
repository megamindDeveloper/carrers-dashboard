"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import React from "react";
import MenuBar from "./rich-text-editor-menubar";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

// Custom extension to handle bullet point pasting
const BulletPasteExtension = Extension.create({
  name: 'bulletPaste',
  
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('bulletPaste'),
        props: {
          handlePaste: (view, event) => {
            const clipboardData = event.clipboardData;
            if (!clipboardData) return false;
            
            const text = clipboardData.getData('text/plain');
            if (!text) return false;
            
            // Split by lines and preserve original structure
            const lines = text.split('\n');
            
            // Only trim for analysis, keep originals for processing
            const trimmedLines = lines.map(line => line.trim());
            const nonEmptyLines = trimmedLines.filter(line => line.length > 0);
            const bulletChars = ['•', '●', '◦', '▪', '▫', '-', '*'];
            
            // Check if ALL non-empty lines are bullet points (pure list)
            const allBulletLines = nonEmptyLines.length > 0 && nonEmptyLines.every(line => 
              bulletChars.some(char => line.startsWith(char + ' ') || line.startsWith(char))
            );
            
            // Check if ALL non-empty lines are numbered (pure numbered list)
            const allNumberedLines = nonEmptyLines.length > 0 && nonEmptyLines.every(line => /^\d+[\.\)]\s/.test(line));
            
            // Only convert to a list if ALL non-empty lines are list items (pure list scenario)
            if (allBulletLines && nonEmptyLines.length > 1) {
              event.preventDefault();
              
              const editor = this.editor;
              if (!editor) return false;
              
              // Clean the lines and remove bullet characters
              const listItems = nonEmptyLines.map(line => {
                let cleanLine = line;
                for (const char of bulletChars) {
                  if (cleanLine.startsWith(char + ' ')) {
                    cleanLine = cleanLine.substring(2).trim();
                    break;
                  } else if (cleanLine.startsWith(char)) {
                    cleanLine = cleanLine.substring(1).trim();
                    break;
                  }
                }
                return cleanLine;
              });
              
              // Use TipTap commands to insert bullet list
              editor.chain()
                .focus()
                .insertContent(`<ul><li>${listItems.join('</li><li>')}</li></ul>`)
                .run();
              
              return true;
            }
            
            // Check for pure numbered lists
            if (allNumberedLines && nonEmptyLines.length > 1) {
              event.preventDefault();
              
              const editor = this.editor;
              if (!editor) return false;
              
              const listItems = nonEmptyLines.map(line => {
                return line.replace(/^\d+[\.\)]\s*/, '').trim();
              });
              
              editor.chain()
                .focus()
                .insertContent(`<ol><li>${listItems.join('</li><li>')}</li></ol>`)
                .run();
              
              return true;
            }
            
            // For mixed content, handle it by parsing sections and preserving structure
            const hasMixedContent = nonEmptyLines.some(line => 
              bulletChars.some(char => line.startsWith(char + ' ') || line.startsWith(char))
            ) && !allBulletLines;
            
            if (hasMixedContent || nonEmptyLines.length !== lines.length) {
              event.preventDefault();
              
              const editor = this.editor;
              if (!editor) return false;
              
              let htmlContent = '';
              let currentList = [];
              let currentListType = null;
              
              for (let i = 0; i < lines.length; i++) {
                const originalLine = lines[i];
                const trimmedLine = originalLine.trim();
                
                // Handle empty lines - preserve as paragraph breaks
                if (trimmedLine.length === 0) {
                  // Close any open list first
                  if (currentList.length > 0) {
                    htmlContent += currentListType === 'numbered' 
                      ? `<ol><li>${currentList.join('</li><li>')}</li></ol>`
                      : `<ul><li>${currentList.join('</li><li>')}</li></ul>`;
                    currentList = [];
                    currentListType = null;
                  }
                  
                  // Only add paragraph break if we have content before/after
                  if (i > 0 && i < lines.length - 1) {
                    htmlContent += '<p><br></p>';
                  }
                  continue;
                }
                
                const isBullet = bulletChars.some(char => trimmedLine.startsWith(char + ' ') || trimmedLine.startsWith(char));
                const isNumbered = /^\d+[\.\)]\s/.test(trimmedLine);
                
                if (isBullet) {
                  if (currentListType !== 'bullet') {
                    // Close previous list if different type
                    if (currentList.length > 0) {
                      htmlContent += currentListType === 'numbered' 
                        ? `<ol><li>${currentList.join('</li><li>')}</li></ol>`
                        : `<ul><li>${currentList.join('</li><li>')}</li></ul>`;
                      currentList = [];
                    }
                    currentListType = 'bullet';
                  }
                  
                  // Clean bullet and add to current list
                  let cleanLine = trimmedLine;
                  for (const char of bulletChars) {
                    if (cleanLine.startsWith(char + ' ')) {
                      cleanLine = cleanLine.substring(2).trim();
                      break;
                    } else if (cleanLine.startsWith(char)) {
                      cleanLine = cleanLine.substring(1).trim();
                      break;
                    }
                  }
                  currentList.push(cleanLine);
                  
                } else if (isNumbered) {
                  if (currentListType !== 'numbered') {
                    // Close previous list if different type
                    if (currentList.length > 0) {
                      htmlContent += currentListType === 'bullet' 
                        ? `<ul><li>${currentList.join('</li><li>')}</li></ul>`
                        : `<ol><li>${currentList.join('</li><li>')}</li></ol>`;
                      currentList = [];
                    }
                    currentListType = 'numbered';
                  }
                  
                  const cleanLine = trimmedLine.replace(/^\d+[\.\)]\s*/, '').trim();
                  currentList.push(cleanLine);
                  
                } else {
                  // Regular paragraph - close any open list first
                  if (currentList.length > 0) {
                    htmlContent += currentListType === 'numbered' 
                      ? `<ol><li>${currentList.join('</li><li>')}</li></ol>`
                      : `<ul><li>${currentList.join('</li><li>')}</li></ul>`;
                    currentList = [];
                    currentListType = null;
                  }
                  
                  htmlContent += `<p>${trimmedLine}</p>`;
                }
              }
              
              // Close any remaining list
              if (currentList.length > 0) {
                htmlContent += currentListType === 'numbered' 
                  ? `<ol><li>${currentList.join('</li><li>')}</li></ol>`
                  : `<ul><li>${currentList.join('</li><li>')}</li></ul>`;
              }
              
              editor.chain()
                .focus()
                .insertContent(htmlContent)
                .run();
              
              return true;
            }
            
            return false;
          },
        },
      }),
    ];
  },
});

export default function RichTextEditor({
  content,
  onChange,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: {
          HTMLAttributes: {
            class: "list-disc ml-3 pl-2",
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: "list-decimal ml-3 pl-2",
          },
        },
        listItem: {
          HTMLAttributes: {
            class: "mb-1",
          },
        },
        document: {
          content: 'block+',
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight,
      BulletPasteExtension,
    ],
    content: content,
    editorProps: {
      attributes: {
        class: "min-h-[250px] border-b border-x rounded-b-md p-4 focus:outline-none prose max-w-none prose-sm",
      },
      transformPastedHTML(html) {
        return html
          .replace(/<div[^>]*>/gi, '<p>')
          .replace(/<\/div>/gi, '</p>')
          .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '</p><p>')
          .replace(/<p>\s*<\/p>/gi, '')
          .replace(/<p>\s*<p>/gi, '<p>')
          .replace(/<\/p>\s*<\/p>/gi, '</p>');
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className="flex flex-col">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
