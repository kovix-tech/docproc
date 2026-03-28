'use client'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FieldSchema } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

function SortableField({
  field,
  onEdit,
  onDelete,
}: {
  field: FieldSchema
  onEdit: () => void
  onDelete: () => void
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: field.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-3 p-3 border rounded bg-card"
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground select-none"
        aria-label="Reordenar"
      >
        ⠿
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{field.label}</span>
          <code className="text-xs text-muted-foreground bg-muted px-1 rounded">{field.key}</code>
          <Badge variant="outline" className="text-xs">{field.type}</Badge>
          {field.required && <Badge className="text-xs">requerido</Badge>}
        </div>
        {field.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{field.description}</p>
        )}
        {field.type === 'enum' && field.enumOptions && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Opciones: {field.enumOptions.join(', ')}
          </p>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="sm" onClick={onEdit}>Editar</Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
        >
          Eliminar
        </Button>
      </div>
    </div>
  )
}

export function SortableFieldList({
  fields,
  onReorder,
  onEdit,
  onDelete,
}: {
  fields: FieldSchema[]
  onReorder: (newFields: FieldSchema[]) => void
  onEdit: (field: FieldSchema) => void
  onDelete: (fieldId: string) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = fields.findIndex((f) => f.id === active.id)
    const newIndex = fields.findIndex((f) => f.id === over.id)
    onReorder(arrayMove(fields, oldIndex, newIndex))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {fields.map((field) => (
            <SortableField
              key={field.id}
              field={field}
              onEdit={() => onEdit(field)}
              onDelete={() => onDelete(field.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
