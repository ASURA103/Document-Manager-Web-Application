import StarterKit from '@tiptap/starter-kit';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';

// Single source of truth for the document schema used when converting imports to Tiptap JSON.
// StarterKit (v3) includes headings, bold, italic, underline, lists and links.
// Table nodes let spreadsheets/CSVs import as real tables.
export const tiptapExtensions = [StarterKit, Table, TableRow, TableHeader, TableCell];

export const emptyDoc = () => ({ type: 'doc', content: [{ type: 'paragraph' }] });
