export const openapiDocument = {
  openapi: '3.0.3',
  info: { title: 'E-commerce Platform API', version: '2.0.0', description: 'Production REST API' },
  servers: [{ url: '/api/v1' }],
  tags: [{ name: 'Health' }, { name: 'Auth' }, { name: 'Catalog' }, { name: 'Commerce' }, { name: 'Orders' }],
  paths: {
    '/health': { get: { tags: ['Health'], summary: 'Health check', responses: { '200': { description: 'Healthy' } } } },
    '/auth/register': { post: { tags: ['Auth'], summary: 'Register a customer', responses: { '201': { description: 'Created' }, '400': { description: 'Invalid input' } } } },
    '/auth/login': { post: { tags: ['Auth'], summary: 'Login', responses: { '200': { description: 'Authenticated' }, '401': { description: 'Invalid credentials' } } } },
    '/catalog/products': { get: { tags: ['Catalog'], summary: 'List products', responses: { '200': { description: 'Product page' } } } },
    '/commerce/cart': { get: { tags: ['Commerce'], summary: 'Get cart', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Cart' } } } },
    '/orders': { get: { tags: ['Orders'], summary: 'List my orders', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Orders' } } }, post: { tags: ['Orders'], summary: 'Create an order', security: [{ bearerAuth: [] }], responses: { '201': { description: 'Created' } } } },
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: { Error: { type: 'object', properties: { success: { type: 'boolean' }, error: { type: 'object' } } } },
  },
} as const;
