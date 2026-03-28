import { Trash2 } from 'lucide-react';
import Modal from './Modal';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName: string;
  message?: string;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar eliminación',
  itemName,
  message,
}: DeleteConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-rose-600 shadow-sm">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">¿Estás seguro de que quieres eliminar {itemName}?</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{message || 'Esta acción no se puede deshacer.'}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
          >
            Eliminar
          </button>
        </div>
      </div>
    </Modal>
  );
}
