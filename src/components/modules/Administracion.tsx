import { Plus, Users, Shield, Settings, Bell, Key, Database, Calendar, Clock, MapPin, UserCog, Lock, Activity, FileText, Eye, Save, ToggleLeft, ToggleRight, XCircle, AlertCircle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Loader } from 'lucide-react';
import Table from '../ui/Table';
import Badge from '../ui/Badge';
import Tabs from '../ui/Tabs';
import Modal from '../ui/Modal';
import { FormField, Input, Select, Textarea } from '../ui/FormField';
import RolesPermissions from './RolesPermissions';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useTenant } from '../../contexts/TenantContext';
import { useToast } from '../../contexts/ToastContext';
import { usersService, type TenantUser, type CreateUserInput } from '../../services/users';
import { permissionsService, type RoleWithPermissions } from '../../services/permissions';

interface UserFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  roleId: string;
}

const initialFormData: UserFormData = {
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
  phone: '',
  roleId: '',
};

export default function Administracion() {
  const { currentTenant } = useTenant();
  const toast = useToast();

  const [users, setUsers] = useState<TenantUser[]>([]);
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null);
  const [userModalTab, setUserModalTab] = useState('general');
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, admins: 0, activeToday: 0 });

  const loadData = useCallback(async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      const [usersData, rolesData, statsData] = await Promise.all([
        usersService.getTenantUsers(currentTenant.id),
        permissionsService.getRolesByTenant(currentTenant.id),
        usersService.getUserStats(currentTenant.id),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.showError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [currentTenant, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInputChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormError(null);
  };

  const validateForm = (): string | null => {
    if (!formData.email.trim()) return 'El email es requerido';
    if (!formData.email.includes('@')) return 'El email no es válido';
    if (!formData.password) return 'La contraseña es requerida';
    if (formData.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    if (formData.password !== formData.confirmPassword) return 'Las contraseñas no coinciden';
    if (!formData.firstName.trim()) return 'El nombre es requerido';
    if (!formData.roleId) return 'Debe seleccionar un rol';
    return null;
  };

  const handleCreateUser = async () => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    if (!currentTenant) return;

    try {
      setSubmitting(true);
      setFormError(null);

      const input: CreateUserInput = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim() || undefined,
        roleId: formData.roleId,
        tenantId: currentTenant.id,
      };

      await usersService.createUser(input);
      toast.showSuccess('Usuario creado exitosamente');
      setShowNewUserModal(false);
      setFormData(initialFormData);
      loadData();
    } catch (error) {
      console.error('Error creating user:', error);
      setFormError(error instanceof Error ? error.message : 'Error al crear el usuario');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseNewUserModal = () => {
    setShowNewUserModal(false);
    setFormData(initialFormData);
    setFormError(null);
  };

  const roleOptions = roles.map(role => ({
    value: role.id,
    label: role.name,
  }));

  const locationOptions = [
    { value: 'center', label: 'Sucursal Centro' },
    { value: 'north', label: 'Sucursal Norte' },
    { value: 'south', label: 'Sucursal Sur' },
  ];

  const columns = [
    {
      key: 'display_name',
      label: 'Usuario',
      sortable: true,
      render: (_: string, row: TenantUser) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {row.display_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Sin nombre'}
            </p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Rol',
      render: (_: unknown, row: TenantUser) => {
        const roleName = row.role?.name || 'Sin rol';
        const variants: Record<string, 'error' | 'info' | 'warning' | 'default' | 'success'> = {
          'Administrador': 'error',
          'Admin': 'error',
          'Veterinario': 'info',
          'Aliado': 'warning',
          'Cliente': 'default',
        };
        return <Badge variant={variants[roleName] || 'default'}>{roleName}</Badge>;
      },
    },
    {
      key: 'created_at',
      label: 'Fecha de registro',
      render: (value: string) => {
        if (!value) return '-';
        return new Date(value).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      },
    },
    {
      key: 'status',
      label: 'Estado',
      render: () => <Badge variant="success">Activo</Badge>,
    },
  ];

  const settingSections = [
    { icon: Settings, title: 'Configuración general', description: 'Nombre, logo, información del negocio' },
    { icon: Bell, title: 'Notificaciones', description: 'Configurar alertas y recordatorios automáticos' },
    { icon: Key, title: 'Seguridad', description: 'Autenticación, contraseñas y accesos' },
    { icon: Database, title: 'Respaldos', description: 'Copias de seguridad y restauración' },
  ];

  if (loading && users.length === 0) {
    return <LoadingSpinner message="Cargando administracion..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Administración</h1>
          <p className="text-sm text-gray-500 mt-1">
            Usuarios, roles, permisos y configuración del sistema
          </p>
        </div>
      </div>

      <Tabs
        tabs={[
          {
            id: 'users',
            label: 'Usuarios',
            icon: Users,
            content: (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Gestiona los usuarios y sus permisos de acceso
                  </p>
                  <button
                    onClick={() => setShowNewUserModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                  >
                    <Plus className="w-5 h-5" />
                    Nuevo usuario
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">Total usuarios</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.admins}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">Administradores</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{roles.length}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">Roles</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.activeToday}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">Activos hoy</p>
                  </div>
                </div>

                <Table
                  columns={columns}
                  data={users}
                  onRowClick={(user) => setSelectedUser(user)}
                />
              </div>
            ),
          },
          {
            id: 'roles',
            label: 'Roles y permisos',
            icon: Shield,
            content: <RolesPermissions />,
          },
          {
            id: 'settings',
            label: 'Configuración',
            icon: Settings,
            content: (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {settingSections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <div key={section.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Icon className="w-6 h-6 text-primary-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">{section.title}</h3>
                            <p className="text-sm text-gray-500">{section.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-6">Información del negocio</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <FormField label="Nombre del negocio">
                      <Input defaultValue={currentTenant?.name || ''} />
                    </FormField>
                    <FormField label="Email de contacto">
                      <Input type="email" placeholder="contacto@ejemplo.com" />
                    </FormField>
                    <FormField label="Teléfono">
                      <Input type="tel" placeholder="555-0123" />
                    </FormField>
                    <FormField label="Zona horaria">
                      <Select
                        options={[
                          { value: 'utc-6', label: 'UTC-6 (México)' },
                          { value: 'utc-5', label: 'UTC-5 (Colombia)' },
                          { value: 'utc-3', label: 'UTC-3 (Argentina)' },
                        ]}
                      />
                    </FormField>
                  </div>
                  <div className="flex items-center justify-end gap-3 mt-6">
                    <button className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium">
                      Cancelar
                    </button>
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
                      Guardar cambios
                    </button>
                  </div>
                </div>
              </div>
            ),
          },
        ]}
      />

      <Modal
        isOpen={showNewUserModal}
        onClose={handleCloseNewUserModal}
        title="Nuevo usuario"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleCloseNewUserModal}
              disabled={submitting}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateUser}
              disabled={submitting}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader className="w-4 h-4 animate-spin" />}
              Crear usuario
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {formError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <FormField label="Nombre" required>
              <Input
                placeholder="Juan"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
              />
            </FormField>

            <FormField label="Apellido">
              <Input
                placeholder="Pérez"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
              />
            </FormField>

            <FormField label="Email" required>
              <Input
                type="email"
                placeholder="usuario@ejemplo.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </FormField>

            <FormField label="Teléfono">
              <Input
                type="tel"
                placeholder="555-0123"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </FormField>

            <FormField label="Contraseña" required>
              <Input
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
              />
            </FormField>

            <FormField label="Confirmar contraseña" required>
              <Input
                type="password"
                placeholder="Repetir contraseña"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              />
            </FormField>

            <FormField label="Rol" required>
              <Select
                options={roleOptions}
                value={formData.roleId}
                onChange={(e) => handleInputChange('roleId', e.target.value)}
                placeholder="Seleccionar rol..."
              />
            </FormField>
          </div>

          {roles.length === 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
              <p className="text-sm text-amber-900">
                <strong>Nota:</strong> No hay roles definidos. Primero debes crear roles en la pestaña "Roles y permisos".
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Nota:</strong> El usuario podrá iniciar sesión inmediatamente con las credenciales proporcionadas.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!selectedUser}
        onClose={() => {
          setSelectedUser(null);
          setUserModalTab('general');
        }}
        title={selectedUser ? `Gestionar usuario: ${selectedUser.display_name || selectedUser.email}` : ''}
        size="xl"
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-start gap-6 pb-6 border-b border-gray-200">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <span className="text-2xl font-bold text-white">
                  {(selectedUser.display_name || selectedUser.email)
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {selectedUser.display_name || `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || 'Sin nombre'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{selectedUser.email}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <Badge variant={selectedUser.role?.name?.toLowerCase().includes('admin') ? 'error' : 'info'}>
                        {selectedUser.role?.name || 'Sin rol'}
                      </Badge>
                      <Badge variant="success">Activo</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Guardar cambios
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-200">
              <div className="flex gap-1">
                {[
                  { id: 'general', label: 'Información general', icon: UserCog },
                  { id: 'permissions', label: 'Permisos', icon: Shield },
                  { id: 'activity', label: 'Actividad', icon: Activity },
                  { id: 'settings', label: 'Configuración', icon: Settings },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setUserModalTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        userModalTab === tab.id
                          ? 'border-primary-600 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {userModalTab === 'general' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <FormField label="Nombre" required>
                    <Input defaultValue={selectedUser.first_name || ''} />
                  </FormField>

                  <FormField label="Apellido">
                    <Input defaultValue={selectedUser.last_name || ''} />
                  </FormField>

                  <FormField label="Email" required>
                    <Input type="email" defaultValue={selectedUser.email} disabled />
                  </FormField>

                  <FormField label="Teléfono">
                    <Input type="tel" defaultValue={selectedUser.phone || ''} placeholder="555-0123" />
                  </FormField>

                  <FormField label="Rol" required>
                    <Select
                      options={roleOptions}
                      defaultValue={selectedUser.role_id || ''}
                    />
                  </FormField>

                  <FormField label="Sucursal asignada">
                    <Select
                      options={locationOptions}
                      placeholder="Seleccionar sucursal..."
                    />
                  </FormField>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Información adicional</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <FormField label="Dirección">
                      <Textarea placeholder="Dirección completa" />
                    </FormField>

                    <FormField label="Notas internas">
                      <Textarea placeholder="Comentarios sobre el usuario" />
                    </FormField>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                  <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium">
                      Fecha de registro: {new Date(selectedUser.created_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {userModalTab === 'permissions' && (
              <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                  <p className="text-sm text-amber-900">
                    <strong>Rol actual:</strong> {selectedUser.role?.name || 'Sin rol'} - Los permisos se configuran según el rol asignado
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Permisos del sistema</h4>
                  <div className="space-y-4">
                    {[
                      {
                        category: 'Dashboard y reportes',
                        permissions: [
                          { id: 'view_dashboard', label: 'Ver dashboard principal', enabled: true },
                          { id: 'view_reports', label: 'Ver reportes y estadísticas', enabled: true },
                          { id: 'export_data', label: 'Exportar datos', enabled: false },
                        ],
                      },
                      {
                        category: 'Gestión de mascotas',
                        permissions: [
                          { id: 'view_pets', label: 'Ver mascotas', enabled: true },
                          { id: 'create_pets', label: 'Crear mascotas', enabled: true },
                          { id: 'edit_pets', label: 'Editar mascotas', enabled: true },
                          { id: 'delete_pets', label: 'Eliminar mascotas', enabled: false },
                        ],
                      },
                      {
                        category: 'Administración',
                        permissions: [
                          { id: 'manage_users', label: 'Gestionar usuarios', enabled: selectedUser.role?.name?.toLowerCase().includes('admin') },
                          { id: 'manage_roles', label: 'Gestionar roles y permisos', enabled: selectedUser.role?.name?.toLowerCase().includes('admin') },
                          { id: 'system_settings', label: 'Configuración del sistema', enabled: selectedUser.role?.name?.toLowerCase().includes('admin') },
                        ],
                      },
                    ].map((group) => (
                      <div key={group.category} className="border border-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-3">{group.category}</h5>
                        <div className="space-y-3">
                          {group.permissions.map((permission) => (
                            <label key={permission.id} className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">{permission.label}</span>
                              <div className="flex items-center gap-2">
                                {permission.enabled ? (
                                  <ToggleRight className="w-10 h-5 text-green-600 cursor-pointer" />
                                ) : (
                                  <ToggleLeft className="w-10 h-5 text-gray-400 cursor-pointer" />
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {userModalTab === 'activity' && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Activity className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">-</p>
                        <p className="text-xs text-gray-500">Acciones totales</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">-</p>
                        <p className="text-xs text-gray-500">Tiempo activo</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">-</p>
                        <p className="text-xs text-gray-500">Días activo</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Actividad reciente</h4>
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>El registro de actividad estará disponible próximamente</p>
                  </div>
                </div>
              </div>
            )}

            {userModalTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Estado de la cuenta</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Shield className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Cuenta activa</p>
                          <p className="text-xs text-gray-500">El usuario puede acceder al sistema</p>
                        </div>
                      </div>
                      <ToggleRight className="w-10 h-5 text-green-600 cursor-pointer" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Seguridad</h4>
                  <div className="space-y-3">
                    <button className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Lock className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900">Restablecer contraseña</p>
                          <p className="text-xs text-gray-500">Enviar enlace de recuperación al usuario</p>
                        </div>
                      </div>
                      <span className="text-sm text-primary-600 font-medium">Enviar</span>
                    </button>

                    <button className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Key className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900">Cerrar todas las sesiones</p>
                          <p className="text-xs text-gray-500">Forzar cierre de sesión en todos los dispositivos</p>
                        </div>
                      </div>
                      <span className="text-sm text-primary-600 font-medium">Cerrar</span>
                    </button>

                    <button className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                          <Eye className="w-5 h-5 text-cyan-600" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900">Ver registro de auditoría</p>
                          <p className="text-xs text-gray-500">Historial completo de acciones</p>
                        </div>
                      </div>
                      <span className="text-sm text-primary-600 font-medium">Ver</span>
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-red-900 mb-4">Zona de peligro</h4>
                  <div className="space-y-3">
                    <button className="w-full flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-red-900">Suspender cuenta</p>
                          <p className="text-xs text-red-600">El usuario no podrá acceder temporalmente</p>
                        </div>
                      </div>
                      <span className="text-sm text-red-600 font-medium">Suspender</span>
                    </button>

                    <button className="w-full flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-red-900">Eliminar usuario</p>
                          <p className="text-xs text-red-600">Acción irreversible, se eliminarán todos los datos</p>
                        </div>
                      </div>
                      <span className="text-sm text-red-600 font-medium">Eliminar</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
