import Dropdown, { MenuDivider, MenuItem } from './Dropdown.jsx'

const trigger = 'rounded px-2.5 py-1 text-sm hover:bg-slate-200/80 aria-expanded:bg-slate-200/80'

// Every item below is wired to a real action; nothing here is a placeholder.
export default function MenuBar({ editor, autosave, canWrite, isOwner, viewMode, zoom, showCount, actions }) {
  const c = () => editor.chain().focus()
  const mod = navigator.platform.includes('Mac') ? '⌘' : 'Ctrl+'
  const W = !canWrite || viewMode // formatting disabled when read-only / viewing mode

  return (
    <nav aria-label="Menu" className="no-print flex flex-wrap items-center px-2">
      <Dropdown label="File" buttonClass={trigger} trigger="File">
        <MenuItem onClick={actions.newDocument}>New document</MenuItem>
        <MenuItem onClick={actions.goHome}>All documents</MenuItem>
        <MenuDivider />
        <MenuItem onClick={actions.history}>Version history</MenuItem>
        <MenuItem shortcut={`${mod}S`} disabled={W} onClick={actions.save}>Save now</MenuItem>
        <MenuItem active={autosave} disabled={!canWrite} onClick={actions.toggleAutosave}>Autosave: {autosave ? 'On' : 'Off'}</MenuItem>
        <MenuDivider />
        <MenuItem disabled={!isOwner} onClick={actions.share}>Share…</MenuItem>
        <MenuItem disabled={!isOwner} onClick={actions.rename}>Rename</MenuItem>
        <MenuDivider />
        <MenuItem onClick={actions.download}>Download as…</MenuItem>
        <MenuItem shortcut={`${mod}P`} onClick={actions.print}>Print</MenuItem>
        <MenuDivider />
        <MenuItem danger disabled={!isOwner} onClick={actions.remove}>Delete document</MenuItem>
      </Dropdown>

      <Dropdown label="Edit" buttonClass={trigger} trigger="Edit">
        <MenuItem shortcut={`${mod}Z`} disabled={W} onClick={() => c().undo().run()}>Undo</MenuItem>
        <MenuItem shortcut={`${mod}Y`} disabled={W} onClick={() => c().redo().run()}>Redo</MenuItem>
        <MenuDivider />
        <MenuItem shortcut={`${mod}A`} onClick={() => c().selectAll().run()}>Select all</MenuItem>
        <MenuItem disabled={W} onClick={() => c().unsetAllMarks().clearNodes().run()}>Clear formatting</MenuItem>
      </Dropdown>

      <Dropdown label="View" buttonClass={trigger} trigger="View">
        {canWrite && (
          <>
            <MenuItem active={!viewMode} onClick={() => actions.setViewMode(false)}>Editing mode</MenuItem>
            <MenuItem active={viewMode} onClick={() => actions.setViewMode(true)}>Viewing mode</MenuItem>
            <MenuDivider />
          </>
        )}
        {[75, 100, 125, 150].map((z) => (
          <MenuItem key={z} active={zoom === z} onClick={() => actions.setZoom(z)}>Zoom {z}%</MenuItem>
        ))}
        <MenuDivider />
        <MenuItem onClick={actions.comments}>Comments</MenuItem>
        <MenuItem active={showCount} onClick={actions.toggleCount}>Show word count</MenuItem>
      </Dropdown>

      <Dropdown label="Insert" buttonClass={trigger} trigger="Insert">
        <MenuItem shortcut={`${mod}K`} disabled={W} onClick={actions.link}>Link…</MenuItem>
        <MenuItem disabled={W} onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>Table (3 × 3)</MenuItem>
        <MenuItem disabled={W} onClick={() => c().addRowAfter().run()}>Table: add row below</MenuItem>
        <MenuItem disabled={W} onClick={() => c().addColumnAfter().run()}>Table: add column right</MenuItem>
        <MenuItem disabled={W} onClick={() => c().deleteRow().run()}>Table: delete row</MenuItem>
        <MenuItem disabled={W} onClick={() => c().deleteColumn().run()}>Table: delete column</MenuItem>
        <MenuItem disabled={W} onClick={() => c().deleteTable().run()}>Table: delete table</MenuItem>
        <MenuDivider />
        <MenuItem disabled={W} onClick={() => c().setHorizontalRule().run()}>Horizontal line</MenuItem>
        <MenuItem disabled={W} onClick={() => c().toggleTaskList().run()}>Checklist</MenuItem>
        <MenuItem disabled={W} onClick={() => c().toggleBlockquote().run()}>Quote</MenuItem>
        <MenuItem disabled={W} onClick={() => c().toggleCodeBlock().run()}>Code block</MenuItem>
      </Dropdown>

      <Dropdown label="Format" buttonClass={trigger} trigger="Format">
        <MenuItem shortcut={`${mod}B`} disabled={W} onClick={() => c().toggleBold().run()}>Bold</MenuItem>
        <MenuItem shortcut={`${mod}I`} disabled={W} onClick={() => c().toggleItalic().run()}>Italic</MenuItem>
        <MenuItem shortcut={`${mod}U`} disabled={W} onClick={() => c().toggleUnderline().run()}>Underline</MenuItem>
        <MenuItem disabled={W} onClick={() => c().toggleStrike().run()}>Strikethrough</MenuItem>
        <MenuDivider />
        <MenuItem disabled={W} onClick={() => c().setParagraph().run()}>Normal text</MenuItem>
        {[1, 2, 3].map((l) => <MenuItem key={l} disabled={W} onClick={() => c().setHeading({ level: l }).run()}>Heading {l}</MenuItem>)}
        <MenuDivider />
        {['left', 'center', 'right', 'justify'].map((a) => (
          <MenuItem key={a} disabled={W} onClick={() => c().setTextAlign(a).run()}>Align {a}</MenuItem>
        ))}
        <MenuDivider />
        <MenuItem disabled={W} onClick={() => c().toggleBulletList().run()}>Bulleted list</MenuItem>
        <MenuItem disabled={W} onClick={() => c().toggleOrderedList().run()}>Numbered list</MenuItem>
      </Dropdown>

      <Dropdown label="Tools" buttonClass={trigger} trigger="Tools">
        <MenuItem onClick={actions.wordCount}>Word count…</MenuItem>
      </Dropdown>

      <Dropdown label="Help" buttonClass={trigger} trigger="Help">
        <MenuItem onClick={actions.shortcuts}>Keyboard shortcuts</MenuItem>
      </Dropdown>
    </nav>
  )
}
