export const errorMessages = {
  loading: 'Error al cargar datos',
  saving: 'Error al guardar',
  deleting: 'Error al eliminar',
  updating: 'Error al actualizar',
  creating: 'Error al crear',
  notFound: 'No se encontró el registro',
  missingData: 'Por favor, completa todos los campos requeridos',
  unauthorized: 'No tienes permisos para realizar esta acción',
  generic: 'Ha ocurrido un error. Por favor, intenta nuevamente'
};

export const successMessages = {
  saved: 'Guardado exitosamente',
  deleted: 'Eliminado exitosamente',
  updated: 'Actualizado exitosamente',
  created: 'Creado exitosamente'
};

export const confirmMessages = {
  delete: (itemName: string) => `¿Estás seguro de que deseas eliminar ${itemName}? Esta acción no se puede deshacer.`,
  unsavedChanges: '¿Deseas salir sin guardar los cambios?'
};

export function formatErrorMessage(action: string, error: any): string {
  const message = error?.message || error?.error_description || 'Error desconocido';
  return `Error al ${action}: ${message}`;
}

let toastHandlers: {
  showSuccess?: (message: string) => void;
  showError?: (message: string) => void;
  showInfo?: (message: string) => void;
} = {};

export function setToastHandlers(handlers: typeof toastHandlers) {
  toastHandlers = handlers;
}

export function showSuccess(message: string) {
  console.log('SUCCESS:', message);
  if (toastHandlers.showSuccess) {
    toastHandlers.showSuccess(message);
  }
}

export function showError(message: string) {
  console.error('ERROR:', message);
  if (toastHandlers.showError) {
    toastHandlers.showError(message);
  }
}

export function showInfo(message: string) {
  console.log('INFO:', message);
  if (toastHandlers.showInfo) {
    toastHandlers.showInfo(message);
  }
}
