import { useState, useEffect } from 'react';
import { Plus, Settings2, Trash2, CreditCard as Edit2, Check, X, ChevronDown, ChevronRight, Search, Filter, ToggleLeft, ToggleRight, Lock, Database } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import { FormField, Input, Textarea } from '../ui/FormField';
import DeleteConfirmModal from '../ui/DeleteConfirmModal';
import { showSuccess, showError } from '../../utils/messages';
import {
  getSystemParameters,
  createSystemParameter,
  updateSystemParameter,
  deleteSystemParameter,
  toggleParameterActive,
  PARAMETER_TYPES,
  type SystemParameter
} from '../../services/systemParameters';

export default function SystemParameters() {
  const { currentTenant } = useTenant();
  const [parameters, setParameters] = useState<SystemParameter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingParam, setEditingParam] = useState<SystemParameter | null>(null);
  const [paramToDelete, setParamToDelete] = useState<SystemParameter | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    code: '',
    type: '',
    name: '',
    description: '',
    value: '{}',
    sort_order: 0,
    is_active: true
  });

  useEffect(() => {
    if (currentTenant) {
      loadParameters();
    }
  }, [currentTenant]);

  const loadParameters = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);
      const data = await getSystemParameters(currentTenant.id);
      setParameters(data);
      if (data.length > 0) {
        const types = [...new Set(data.map(p => p.type))];
        setExpandedTypes(new Set(types.slice(0, 3)));
      }
    } catch (error) {
      console.error('Error loading parameters:', error);
      showError('Error al cargar los parametros');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = (type?: string) => {
    setEditingParam(null);
    setFormData({
      code: '',
      type: type || selectedType || '',
      name: '',
      description: '',
      value: '{}',
      sort_order: 0,
      is_active: true
    });
    setShowFormModal(true);
  };

  const handleEdit = (param: SystemParameter) => {
    setEditingParam(param);
    setFormData({
      code: param.code || '',
      type: param.type,
      name: param.name,
      description: param.description || '',
      value: JSON.stringify(param.value, null, 2),
      sort_order: param.sort_order,
      is_active: param.is_active
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!currentTenant) return;

    try {
      let parsedValue = {};
      try {
        parsedValue = JSON.parse(formData.value || '{}');
      } catch {
        showError('El campo "Valor" debe ser un JSON valido');
        return;
      }

      if (editingParam) {
        await updateSystemParameter(editingParam.id, {
          code: formData.code || null,
          name: formData.name,
          description: formData.description || null,
          value: parsedValue,
          sort_order: formData.sort_order,
          is_active: formData.is_active
        });
        showSuccess('Parametro actualizado');
      } else {
        await createSystemParameter(currentTenant.id, {
          code: formData.code || null,
          type: formData.type,
          name: formData.name,
          description: formData.description || null,
          value: parsedValue,
          sort_order: formData.sort_order,
          is_active: formData.is_active
        });
        showSuccess('Parametro creado');
      }

      setShowFormModal(false);
      loadParameters();
    } catch (error: any) {
      console.error('Error saving parameter:', error);
      showError('Error al guardar: ' + error.message);
    }
  };

  const handleDelete = async () => {
    if (!paramToDelete) return;

    try {
      await deleteSystemParameter(paramToDelete.id);
      showSuccess('Parametro eliminado');
      setShowDeleteModal(false);
      setParamToDelete(null);
      loadParameters();
    } catch (error: any) {
      console.error('Error deleting parameter:', error);
      showError('Error al eliminar: ' + error.message);
    }
  };

  const handleToggleActive = async (param: SystemParameter) => {
    try {
      await toggleParameterActive(param.id, !param.is_active);
      loadParameters();
    } catch (error) {
      console.error('Error toggling parameter:', error);
      showError('Error al cambiar estado');
    }
  };

  const toggleTypeExpanded = (type: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedTypes(newExpanded);
  };

  const groupedParameters = parameters.reduce((acc, param) => {
    if (!acc[param.type]) {
      acc[param.type] = [];
    }
    acc[param.type].push(param);
    return acc;
  }, {} as Record<string, SystemParameter[]>);

  const filteredTypes = Object.keys(groupedParameters).filter(type => {
    if (selectedType && type !== selectedType) return false;
    if (searchTerm) {
      const typeParams = groupedParameters[type];
      return typeParams.some(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return true;
  });

  const getTypeInfo = (typeCode: string) => {
    return PARAMETER_TYPES.find(t => t.code === typeCode) || { code: typeCode, name: typeCode, description: '' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-teal-600" />
            Parametros del Sistema
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Gestiona catalogos, vacunas, servicios y otros datos maestros
          </p>
        </div>
        <button
          onClick={() => handleCreateNew()}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition"
        >
          <Plus className="w-4 h-4" />
          Nuevo Parametro
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar parametros..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <select
            value={selectedType || ''}
            onChange={(e) => setSelectedType(e.target.value || null)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="">Todos los tipos</option>
            {PARAMETER_TYPES.map(type => (
              <option key={type.code} value={type.code}>{type.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {PARAMETER_TYPES.slice(0, 4).map(type => {
          const count = groupedParameters[type.code]?.length || 0;
          return (
            <div
              key={type.code}
              onClick={() => setSelectedType(selectedType === type.code ? null : type.code)}
              className={`p-4 rounded-xl border cursor-pointer transition ${
                selectedType === type.code
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-slate-200 bg-white hover:border-teal-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{type.name}</p>
                  <p className="text-xs text-slate-500">{type.description}</p>
                </div>
                <span className="text-2xl font-bold text-teal-600">{count}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        {filteredTypes.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl">
            <Settings2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No se encontraron parametros</p>
          </div>
        ) : (
          filteredTypes.map(type => {
            const typeInfo = getTypeInfo(type);
            const params = groupedParameters[type].filter(p =>
              !searchTerm ||
              p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.code?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            const isExpanded = expandedTypes.has(type);

            return (
              <div key={type} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => toggleTypeExpanded(type)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                    <div className="text-left">
                      <h3 className="font-semibold text-slate-900">{typeInfo.name}</h3>
                      <p className="text-xs text-slate-500">{typeInfo.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="default">{params.length} items</Badge>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateNew(type);
                      }}
                      className="p-1.5 rounded-lg bg-teal-100 text-teal-600 hover:bg-teal-200 transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </button>

                {isExpanded && (
                  <div className="divide-y divide-slate-100">
                    {params.map(param => (
                      <div
                        key={param.id}
                        className={`px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition ${
                          !param.is_active ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {param.is_system && (
                            <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900">{param.name}</span>
                              {param.code && (
                                <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                  {param.code}
                                </code>
                              )}
                              {!param.is_active && (
                                <Badge variant="warning">Inactivo</Badge>
                              )}
                            </div>
                            {param.description && (
                              <p className="text-xs text-slate-500 truncate">{param.description}</p>
                            )}
                            {Object.keys(param.value || {}).length > 0 && (
                              <p className="text-xs text-teal-600 mt-1">
                                {Object.entries(param.value).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleActive(param)}
                            className={`p-1.5 rounded-lg transition ${
                              param.is_active
                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                            title={param.is_active ? 'Desactivar' : 'Activar'}
                          >
                            {param.is_active ? (
                              <ToggleRight className="w-4 h-4" />
                            ) : (
                              <ToggleLeft className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEdit(param)}
                            className="p-1.5 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!param.is_system && (
                            <button
                              onClick={() => {
                                setParamToDelete(param);
                                setShowDeleteModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {params.length === 0 && (
                      <div className="px-4 py-6 text-center text-slate-500 text-sm">
                        No hay parametros de este tipo
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingParam ? 'Editar Parametro' : 'Nuevo Parametro'}
      >
        <div className="space-y-4">
          <FormField label="Tipo" required>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              disabled={!!editingParam}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-slate-100"
            >
              <option value="">Seleccionar tipo...</option>
              {PARAMETER_TYPES.map(type => (
                <option key={type.code} value={type.code}>{type.name}</option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Codigo">
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="codigo_unico"
              />
            </FormField>
            <FormField label="Orden">
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              />
            </FormField>
          </div>

          <FormField label="Nombre" required>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nombre del parametro"
            />
          </FormField>

          <FormField label="Descripcion">
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripcion opcional..."
              rows={2}
            />
          </FormField>

          <FormField label="Valor (JSON)">
            <Textarea
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              placeholder='{"price": 100, "duration": 30}'
              rows={3}
              className="font-mono text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              Datos adicionales en formato JSON (precio, duracion, etc.)
            </p>
          </FormField>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
              />
              <span className="text-sm text-slate-700">Activo</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setShowFormModal(false)}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.type || !formData.name}
              className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
            >
              {editingParam ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </div>
      </Modal>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setParamToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Eliminar Parametro"
        message={`Esta seguro de eliminar "${paramToDelete?.name}"? Esta accion no se puede deshacer.`}
      />
    </div>
  );
}
