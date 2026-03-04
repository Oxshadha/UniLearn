'use client'

import ModuleEditor from './module-editor'

interface Props {
    moduleId: string
    canEdit: boolean
    userBatchNumber: number
    userIndex?: string
}

export default function ModuleEditorWrapper({ moduleId, canEdit }: Props) {
    return <ModuleEditor moduleId={moduleId} canEdit={canEdit} />
}
