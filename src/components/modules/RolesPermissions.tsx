import { useState, useEffect } from 'react';
import { Shield, Plus, CreditCard as Edit2, Trash2, Save, X, Check, Users, Loader } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { permissionsService, Permission, RoleWithPermissions } from '../../services/permissions';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import { FormField, Input, Textarea } from '../ui/FormField';

export default function RolesPermissions() {
  const { currentTenant } = useTenant();
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (currentTenant) {
      loadData();
    }
  }, [currentTenant]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, permissionsData] = await Promise.all([
        permissionsService.getRolesByTenant(currentTenant!.id),
        permissionsService.getAllPermissions()
      ]);

      setRoles(rolesData);
      setAllPermissions(permissionsData);
    } catch (error) {
      console.error('Error loading roles and permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (role: RoleWithPermissions) => {
    setEditingRole(role);
    setFormData({ name: role.name, description: role.description || '' });
    setSelectedPermissions(new Set(role.permissions.map(p => p.id)));
    setShowModal(true);
  };

  const handleNewRole = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '' });
    setSelectedPermissions(new Set());
    setShowModal(true);
  };

  const handleSaveRole = async () => {
    try {
      setLoading(true);

      if (editingRole) {
        await permissionsService.updateRole(editingRole.id, formData.name, formData.description);
        await permissionsService.updateRolePermissions(
          currentTenant!.id,
          editingRole.id,
          Array.from(selectedPermissions)
        );
      } else {
        const newRole = await permissionsService.createRole(
          currentTenant!.id,
          formData.name,
          formData.description
        );
        await permissionsService.updateRolePermissions(
          currentTenant!.id,
          newRole.id,
          Array.from(selectedPermissions)
        );
      }

      setShowModal(false);
      await loadData();
    } catch (error: any) {
      console.error('Error saving role:', error);
      alert('Error al guardar el rol: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('¿Estás seguro de eliminar este rol?')) return;

    try {
      setLoading(true);
      await permissionsService.deleteRole(roleId);
      await loadData();
    } catch (error: any) {
      console.error('Error deleting role:', error);
      alert('Error al eliminar el rol: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permissionId: string) => {
    const newSet = new Set(selectedPermissions);
    if (newSet.has(permissionId)) {
      newSet.delete(permissionId);
    } else {
      newSet.add(permissionId);
    }
    setSelectedPermissions(newSet);
  };

  const toggleModule = (modulePerms: Permission[]) => {
    const moduleIds = modulePerms.map(p => p.id);
    const allSelected = moduleIds.every(id => selectedPermissions.has(id));

    const newSet = new Set(selectedPermissions);
    if (allSelected) {
      moduleIds.forEach(id => newSet.delete(id));
    } else {
      moduleIds.forEach(id => newSet.add(id));
    }
    setSelectedPermissions(newSet);
  };

  const groupedPermissions = permissionsService.groupPermissionsByModule(allPermissions);

  const filteredGrouped = Object.entries(groupedPermissions).filter(([module]) =>
    module.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getModuleLabel = (module: string): string => {
    const labels: Record<string, string> = {
      dashboard: 'Dashboard',
      mascotas: 'Mascotas',
      duenos: 'Dueños',
      salud: 'Salud / Consultas',
      agenda: 'Agenda',
      servicios: 'Servicios',
      ordenes: 'Órdenes',
      comercio: 'Comercio',
      pos: 'POS',
      pagos: 'Pagos y Finanzas',
      aliados: 'Aliados',
      clientes: 'Clientes',
      logistica: 'Logística',
      marketing: 'Marketing y CRM',
      reportes: 'Reportes',
      administracion: 'Administración',
      configuracion: 'Configuración',
      api: 'API Docs'
    };
    return labels[module] || module;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-600">
            Define roles y asigna permisos específicos para cada tipo de usuario
          </p>
        </div>
        <button
          onClick={handleNewRole}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-5 h-5" />
          Nuevo Rol
        </button>
      </div>

      {loading && !roles.length ? (
        <div className="text-center py-12 text-slate-500">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map(role => (
            <div
              key={role.id}
              className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-cyan-100 rounded-lg">
                    <Shield className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{role.name}</h3>
                    {role.description && (
                      <p className="text-sm text-slate-600 mt-1">{role.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {role.user_count || 0} usuario{role.user_count !== 1 ? 's' : ''} asignado{role.user_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditRole(role)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {!role.is_system && (
                    <button
                      onClick={() => handleDeleteRole(role.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {role.permissions.slice(0, 3).map(perm => (
                  <div
                    key={perm.id}
                    className="flex items-center gap-2 text-sm text-slate-600"
                  >
                    <Check className="w-4 h-4 text-green-500" />
                    <span>{perm.description}</span>
                  </div>
                ))}
                {role.permissions.length > 3 && (
                  <div className="text-sm text-slate-500 ml-6">
                    +{role.permissions.length - 3} permisos más
                  </div>
                )}
                {role.permissions.length === 0 && (
                  <div className="text-sm text-slate-400 italic">
                    Sin permisos asignados
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingRole ? `Editar Rol: ${editingRole.name}` : 'Nuevo Rol'}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <FormField label="Nombre del Rol" required>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Veterinario, Administrador..."
                required
              />
            </FormField>

            <FormField label="Descripción">
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe las responsabilidades de este rol..."
                rows={2}
              />
            </FormField>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Permisos
              </label>
              <input
                type="text"
                placeholder="Buscar módulo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />

              <div className="space-y-4 max-h-96 overflow-y-auto border border-slate-200 rounded-lg p-4">
                {filteredGrouped.map(([module, permissions]) => {
                  const allSelected = permissions.every(p => selectedPermissions.has(p.id));
                  const someSelected = permissions.some(p => selectedPermissions.has(p.id));

                  return (
                    <div key={module} className="border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => toggleModule(permissions)}
                          className="w-4 h-4 text-cyan-600 rounded"
                        />
                        <span className="font-semibold text-slate-900">
                          {getModuleLabel(module)}
                        </span>
                        {someSelected && !allSelected && (
                          <Badge variant="warning">Parcial</Badge>
                        )}
                      </div>

                      <div className="ml-6 space-y-2">
                        {permissions.map(perm => (
                          <label
                            key={perm.id}
                            className="flex items-center gap-2 text-sm text-slate-700 hover:bg-slate-50 p-2 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.has(perm.id)}
                              onChange={() => togglePermission(perm.id)}
                              className="w-4 h-4 text-cyan-600 rounded"
                            />
                            <span>{perm.description}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">
                  <strong>{selectedPermissions.size}</strong> permisos seleccionados
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <X className="w-4 h-4 inline mr-2" />
                Cancelar
              </button>
              <button
                onClick={handleSaveRole}
                disabled={loading || !formData.name}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 inline" />
                    {editingRole ? 'Actualizar' : 'Crear'} Rol
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
