import { Code2, Lock, Zap, ChevronDown, ChevronRight, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import Badge from '../ui/Badge';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  auth: boolean;
  parameters?: { name: string; type: string; required: boolean; description: string }[];
  requestBody?: { field: string; type: string; required: boolean; description: string }[];
  responses: { code: number; description: string; example?: string }[];
}

interface ApiGroup {
  name: string;
  description: string;
  endpoints: ApiEndpoint[];
}

const apiGroups: ApiGroup[] = [
  {
    name: 'Autenticación',
    description: 'Endpoints para gestión de autenticación y tokens',
    endpoints: [
      {
        method: 'POST',
        path: '/api/auth/login',
        description: 'Iniciar sesión y obtener token de acceso',
        auth: false,
        requestBody: [
          { field: 'email', type: 'string', required: true, description: 'Email del usuario' },
          { field: 'password', type: 'string', required: true, description: 'Contraseña del usuario' },
        ],
        responses: [
          {
            code: 200,
            description: 'Login exitoso',
            example: JSON.stringify({ token: 'eyJhbGciOiJIUzI1...', user: { id: 1, email: 'user@example.com' } }, null, 2),
          },
          { code: 401, description: 'Credenciales inválidas' },
        ],
      },
      {
        method: 'POST',
        path: '/api/auth/register',
        description: 'Registrar un nuevo usuario',
        auth: false,
        requestBody: [
          { field: 'name', type: 'string', required: true, description: 'Nombre completo' },
          { field: 'email', type: 'string', required: true, description: 'Email del usuario' },
          { field: 'password', type: 'string', required: true, description: 'Contraseña (mínimo 8 caracteres)' },
        ],
        responses: [
          { code: 201, description: 'Usuario creado exitosamente' },
          { code: 400, description: 'Datos inválidos o email ya existe' },
        ],
      },
      {
        method: 'POST',
        path: '/api/auth/logout',
        description: 'Cerrar sesión y revocar token',
        auth: true,
        responses: [{ code: 200, description: 'Sesión cerrada exitosamente' }],
      },
    ],
  },
  {
    name: 'Mascotas',
    description: 'Gestión de mascotas y sus datos',
    endpoints: [
      {
        method: 'GET',
        path: '/api/pets',
        description: 'Obtener listado de mascotas',
        auth: true,
        parameters: [
          { name: 'page', type: 'integer', required: false, description: 'Número de página (default: 1)' },
          { name: 'limit', type: 'integer', required: false, description: 'Items por página (default: 20)' },
          { name: 'owner_id', type: 'integer', required: false, description: 'Filtrar por ID de propietario' },
          { name: 'species', type: 'string', required: false, description: 'Filtrar por especie (dog, cat, etc.)' },
        ],
        responses: [
          {
            code: 200,
            description: 'Lista de mascotas',
            example: JSON.stringify({ data: [{ id: 1, name: 'Max', species: 'dog', breed: 'Golden Retriever' }], total: 1, page: 1 }, null, 2),
          },
        ],
      },
      {
        method: 'POST',
        path: '/api/pets',
        description: 'Crear una nueva mascota',
        auth: true,
        requestBody: [
          { field: 'name', type: 'string', required: true, description: 'Nombre de la mascota' },
          { field: 'species', type: 'string', required: true, description: 'Especie (dog, cat, bird, etc.)' },
          { field: 'breed', type: 'string', required: false, description: 'Raza' },
          { field: 'birth_date', type: 'date', required: false, description: 'Fecha de nacimiento' },
          { field: 'owner_id', type: 'integer', required: true, description: 'ID del propietario' },
          { field: 'microchip', type: 'string', required: false, description: 'Número de microchip' },
        ],
        responses: [
          { code: 201, description: 'Mascota creada exitosamente' },
          { code: 400, description: 'Datos inválidos' },
        ],
      },
      {
        method: 'GET',
        path: '/api/pets/{id}',
        description: 'Obtener detalles de una mascota',
        auth: true,
        parameters: [{ name: 'id', type: 'integer', required: true, description: 'ID de la mascota' }],
        responses: [
          { code: 200, description: 'Detalles de la mascota' },
          { code: 404, description: 'Mascota no encontrada' },
        ],
      },
      {
        method: 'PUT',
        path: '/api/pets/{id}',
        description: 'Actualizar datos de una mascota',
        auth: true,
        parameters: [{ name: 'id', type: 'integer', required: true, description: 'ID de la mascota' }],
        requestBody: [
          { field: 'name', type: 'string', required: false, description: 'Nombre de la mascota' },
          { field: 'breed', type: 'string', required: false, description: 'Raza' },
          { field: 'weight', type: 'number', required: false, description: 'Peso en kg' },
        ],
        responses: [
          { code: 200, description: 'Mascota actualizada exitosamente' },
          { code: 404, description: 'Mascota no encontrada' },
        ],
      },
      {
        method: 'DELETE',
        path: '/api/pets/{id}',
        description: 'Eliminar una mascota',
        auth: true,
        parameters: [{ name: 'id', type: 'integer', required: true, description: 'ID de la mascota' }],
        responses: [
          { code: 200, description: 'Mascota eliminada exitosamente' },
          { code: 404, description: 'Mascota no encontrada' },
        ],
      },
    ],
  },
  {
    name: 'Clientes',
    description: 'Gestión de clientes y propietarios',
    endpoints: [
      {
        method: 'GET',
        path: '/api/clients',
        description: 'Obtener listado de clientes',
        auth: true,
        parameters: [
          { name: 'page', type: 'integer', required: false, description: 'Número de página' },
          { name: 'search', type: 'string', required: false, description: 'Buscar por nombre o email' },
          { name: 'segment', type: 'string', required: false, description: 'Filtrar por segmento (vip, regular, new)' },
        ],
        responses: [{ code: 200, description: 'Lista de clientes' }],
      },
      {
        method: 'POST',
        path: '/api/clients',
        description: 'Crear un nuevo cliente',
        auth: true,
        requestBody: [
          { field: 'name', type: 'string', required: true, description: 'Nombre completo' },
          { field: 'email', type: 'string', required: true, description: 'Email' },
          { field: 'phone', type: 'string', required: true, description: 'Teléfono' },
          { field: 'address', type: 'object', required: false, description: 'Dirección completa' },
        ],
        responses: [
          { code: 201, description: 'Cliente creado exitosamente' },
          { code: 400, description: 'Email ya existe' },
        ],
      },
      {
        method: 'GET',
        path: '/api/clients/{id}',
        description: 'Obtener detalles de un cliente',
        auth: true,
        parameters: [{ name: 'id', type: 'integer', required: true, description: 'ID del cliente' }],
        responses: [{ code: 200, description: 'Detalles del cliente' }],
      },
    ],
  },
  {
    name: 'Servicios',
    description: 'Gestión de reservas y servicios',
    endpoints: [
      {
        method: 'GET',
        path: '/api/bookings',
        description: 'Obtener listado de reservas',
        auth: true,
        parameters: [
          { name: 'date', type: 'date', required: false, description: 'Filtrar por fecha' },
          { name: 'status', type: 'string', required: false, description: 'Filtrar por estado' },
          { name: 'pet_id', type: 'integer', required: false, description: 'Filtrar por mascota' },
        ],
        responses: [{ code: 200, description: 'Lista de reservas' }],
      },
      {
        method: 'POST',
        path: '/api/bookings',
        description: 'Crear una nueva reserva',
        auth: true,
        requestBody: [
          { field: 'pet_id', type: 'integer', required: true, description: 'ID de la mascota' },
          { field: 'service_type', type: 'string', required: true, description: 'Tipo de servicio' },
          { field: 'date', type: 'date', required: true, description: 'Fecha del servicio' },
          { field: 'time', type: 'string', required: true, description: 'Hora del servicio (HH:MM)' },
          { field: 'notes', type: 'string', required: false, description: 'Notas especiales' },
        ],
        responses: [
          { code: 201, description: 'Reserva creada exitosamente' },
          { code: 409, description: 'Horario no disponible' },
        ],
      },
      {
        method: 'PATCH',
        path: '/api/bookings/{id}/status',
        description: 'Actualizar estado de una reserva',
        auth: true,
        parameters: [{ name: 'id', type: 'integer', required: true, description: 'ID de la reserva' }],
        requestBody: [
          { field: 'status', type: 'string', required: true, description: 'Nuevo estado (confirmed, cancelled, completed)' },
        ],
        responses: [{ code: 200, description: 'Estado actualizado' }],
      },
    ],
  },
  {
    name: 'Salud',
    description: 'Historial médico y vacunas',
    endpoints: [
      {
        method: 'GET',
        path: '/api/pets/{id}/medical-records',
        description: 'Obtener historial médico de una mascota',
        auth: true,
        parameters: [{ name: 'id', type: 'integer', required: true, description: 'ID de la mascota' }],
        responses: [{ code: 200, description: 'Historial médico' }],
      },
      {
        method: 'POST',
        path: '/api/pets/{id}/vaccinations',
        description: 'Registrar una vacuna',
        auth: true,
        parameters: [{ name: 'id', type: 'integer', required: true, description: 'ID de la mascota' }],
        requestBody: [
          { field: 'vaccine_name', type: 'string', required: true, description: 'Nombre de la vacuna' },
          { field: 'date', type: 'date', required: true, description: 'Fecha de aplicación' },
          { field: 'next_date', type: 'date', required: false, description: 'Próxima dosis' },
          { field: 'veterinarian', type: 'string', required: false, description: 'Veterinario que aplicó' },
        ],
        responses: [{ code: 201, description: 'Vacuna registrada' }],
      },
    ],
  },
  {
    name: 'Pagos',
    description: 'Procesamiento de pagos y facturas',
    endpoints: [
      {
        method: 'POST',
        path: '/api/payments',
        description: 'Procesar un pago',
        auth: true,
        requestBody: [
          { field: 'booking_id', type: 'integer', required: true, description: 'ID de la reserva' },
          { field: 'amount', type: 'number', required: true, description: 'Monto a pagar' },
          { field: 'method', type: 'string', required: true, description: 'Método de pago (cash, card, transfer)' },
        ],
        responses: [
          { code: 200, description: 'Pago procesado exitosamente' },
          { code: 400, description: 'Error en el pago' },
        ],
      },
      {
        method: 'GET',
        path: '/api/invoices/{id}',
        description: 'Obtener una factura',
        auth: true,
        parameters: [{ name: 'id', type: 'integer', required: true, description: 'ID de la factura' }],
        responses: [{ code: 200, description: 'Datos de la factura' }],
      },
    ],
  },
];

export default function ApiDocs() {
  const [expandedGroup, setExpandedGroup] = useState<string | null>('Autenticación');
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const getMethodColor = (method: string) => {
    const colors = {
      GET: 'bg-blue-100 text-blue-700 border-blue-200',
      POST: 'bg-green-100 text-green-700 border-green-200',
      PUT: 'bg-amber-100 text-amber-700 border-amber-200',
      DELETE: 'bg-red-100 text-red-700 border-red-200',
      PATCH: 'bg-purple-100 text-purple-700 border-purple-200',
    };
    return colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const generateCurlExample = (endpoint: ApiEndpoint) => {
    let curl = `curl -X ${endpoint.method} "${window.location.origin}${endpoint.path}"`;

    if (endpoint.auth) {
      curl += ' \\\n  -H "Authorization: Bearer YOUR_TOKEN"';
    }

    curl += ' \\\n  -H "Content-Type: application/json"';

    if (endpoint.requestBody) {
      const body: any = {};
      endpoint.requestBody.forEach(field => {
        body[field.field] = field.type === 'string' ? 'example' : field.type === 'number' ? 0 : null;
      });
      curl += ` \\\n  -d '${JSON.stringify(body, null, 2)}'`;
    }

    return curl;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Documentación API</h1>
          <p className="text-sm text-gray-500 mt-1">
            Explora y prueba todos los endpoints disponibles
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">API Base URL</p>
            <p className="text-xs text-gray-500 font-mono">{window.location.origin}/api</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Code2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{apiGroups.reduce((acc, g) => acc + g.endpoints.length, 0)}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Endpoints disponibles</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">v1.0</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Versión actual</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Lock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">Bearer</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Autenticación</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900">Autenticación</h4>
            <p className="text-sm text-blue-700 mt-1">
              La mayoría de los endpoints requieren autenticación mediante Bearer Token. Incluye el header:{' '}
              <code className="bg-blue-100 px-2 py-0.5 rounded font-mono text-xs">Authorization: Bearer YOUR_TOKEN</code>
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {apiGroups.map((group) => (
          <div key={group.name} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => setExpandedGroup(expandedGroup === group.name ? null : group.name)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {expandedGroup === group.name ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">{group.name}</h3>
                  <p className="text-sm text-gray-500">{group.description}</p>
                </div>
              </div>
              <Badge variant="default">{group.endpoints.length} endpoints</Badge>
            </button>

            {expandedGroup === group.name && (
              <div className="border-t border-gray-100">
                {group.endpoints.map((endpoint, idx) => {
                  const endpointId = `${group.name}-${idx}`;
                  const isExpanded = expandedEndpoint === endpointId;

                  return (
                    <div key={idx} className="border-b border-gray-100 last:border-b-0">
                      <button
                        onClick={() => setExpandedEndpoint(isExpanded ? null : endpointId)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded text-xs font-semibold border ${getMethodColor(endpoint.method)}`}>
                            {endpoint.method}
                          </span>
                          <code className="text-sm font-mono text-gray-700">{endpoint.path}</code>
                          {endpoint.auth && <Lock className="w-4 h-4 text-gray-400" />}
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="px-6 py-4 bg-gray-50 space-y-4">
                          <p className="text-sm text-gray-700">{endpoint.description}</p>

                          {endpoint.parameters && endpoint.parameters.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-2">Parámetros</h4>
                              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Nombre</th>
                                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Tipo</th>
                                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Requerido</th>
                                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Descripción</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {endpoint.parameters.map((param, i) => (
                                      <tr key={i} className="border-b border-gray-100 last:border-b-0">
                                        <td className="px-4 py-2 font-mono text-xs">{param.name}</td>
                                        <td className="px-4 py-2 text-gray-600">{param.type}</td>
                                        <td className="px-4 py-2">
                                          {param.required ? (
                                            <Badge variant="error">Sí</Badge>
                                          ) : (
                                            <Badge variant="default">No</Badge>
                                          )}
                                        </td>
                                        <td className="px-4 py-2 text-gray-600">{param.description}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {endpoint.requestBody && endpoint.requestBody.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-2">Request Body</h4>
                              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Campo</th>
                                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Tipo</th>
                                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Requerido</th>
                                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Descripción</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {endpoint.requestBody.map((field, i) => (
                                      <tr key={i} className="border-b border-gray-100 last:border-b-0">
                                        <td className="px-4 py-2 font-mono text-xs">{field.field}</td>
                                        <td className="px-4 py-2 text-gray-600">{field.type}</td>
                                        <td className="px-4 py-2">
                                          {field.required ? (
                                            <Badge variant="error">Sí</Badge>
                                          ) : (
                                            <Badge variant="default">No</Badge>
                                          )}
                                        </td>
                                        <td className="px-4 py-2 text-gray-600">{field.description}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Respuestas</h4>
                            <div className="space-y-2">
                              {endpoint.responses.map((response, i) => (
                                <div key={i} className="bg-white rounded-lg border border-gray-200 p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span
                                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                        response.code >= 200 && response.code < 300
                                          ? 'bg-green-100 text-green-700'
                                          : response.code >= 400
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-gray-100 text-gray-700'
                                      }`}
                                    >
                                      {response.code}
                                    </span>
                                    <span className="text-sm text-gray-700">{response.description}</span>
                                  </div>
                                  {response.example && (
                                    <div className="relative">
                                      <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
                                        {response.example}
                                      </pre>
                                      <button
                                        onClick={() => copyToClipboard(response.example!, `${endpointId}-${i}`)}
                                        className="absolute top-2 right-2 p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
                                      >
                                        {copiedCode === `${endpointId}-${i}` ? (
                                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                                        ) : (
                                          <Copy className="w-4 h-4" />
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold text-gray-900">Ejemplo cURL</h4>
                              <button
                                onClick={() => copyToClipboard(generateCurlExample(endpoint), `curl-${endpointId}`)}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900"
                              >
                                {copiedCode === `curl-${endpointId}` ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                                    Copiado
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    Copiar
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
                              {generateCurlExample(endpoint)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
