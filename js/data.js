/*
 * Pelícanos Bros - capa de datos de la demostración.
 *
 * Toda lectura y escritura de localStorage pasa por este archivo.
 * La interfaz debe consumir window.PBData y no acceder directamente
 * a las claves pb_*.
 *
 * IMPORTANTE: localStorage es editable por el visitante y no protege
 * credenciales, sesiones ni pedidos. Las comprobaciones de este módulo
 * sirven para consistencia de la demo, no sustituyen la seguridad del servidor.
 */
(() => {
  "use strict";

  const STORAGE_KEYS = Object.freeze({
    users: "pb_usuarios_v1",
    products: "pb_productos_v1",
    orders: "pb_pedidos_v1",
    customerSession: "pb_sesion_cliente_v1",
    adminSession: "pb_sesion_admin_v1",
    orderCounter: "pb_contador_v1",
    cart: "pb_carrito_v1"
  });

  const CATEGORIES = Object.freeze(["pelicanos", "bebidas", "extras"]);
  const PAYMENT_METHODS = Object.freeze(["efectivo", "yape", "plin", "transferencia"]);
  const PAYMENT_STATUSES = Object.freeze(["pendiente", "pagado"]);

  // El documento llama "pendiente" al estado inicial del pedido.
  // En la interfaz se puede mostrar como "Recibido".
  const ORDER_STATUSES = Object.freeze([
    "pendiente",
    "en_preparacion",
    "listo",
    "entregado",
    "cancelado"
  ]);

  const ORDER_STATUS_LABELS = Object.freeze({
    pendiente: "Recibido",
    en_preparacion: "En preparación",
    listo: "Listo para recoger",
    entregado: "Entregado",
    cancelado: "Cancelado"
  });

  const ORDER_TRANSITIONS = Object.freeze({
    pendiente: ["en_preparacion", "cancelado"],
    en_preparacion: ["listo", "cancelado"],
    listo: ["entregado"],
    entregado: [],
    cancelado: []
  });

  const CUSTOMIZATION_GROUPS = Object.freeze({
    arroz: Object.freeze({
      label: "Arroz",
      normal: 0,
      sin: -2,
      extra: 2
    }),
    papa: Object.freeze({
      label: "Papa",
      normal: 0,
      sin: -2,
      extra: 2
    }),
    ensalada: Object.freeze({
      label: "Ensalada",
      normal: 0,
      sin: -2,
      extra: 2
    }),
    cremas: Object.freeze({
      label: "Cremas de la casa",
      normal: 0,
      sin: -1,
      extra: 1
    })
  });

  const DEFAULT_CUSTOMIZATIONS = Object.freeze({
    arroz: "normal",
    papa: "normal",
    ensalada: "normal",
    cremas: "normal"
  });

  // Hash de contraseñas para esta demostración estática.
  // PBKDF2 usa un salt diferente por cuenta. Esto NO convierte localStorage
  // en un sistema de autenticación seguro: el visitante controla el navegador.
  const PASSWORD_HASH_ITERATIONS = 600000;
  const PASSWORD_HASH_PREFIX = "pbkdf2-sha256";
  const DEMO_USERS = Object.freeze([
    Object.freeze({
      id: "usr-demo-admin",
      name: "Administrador",
      username: "admin",
      email: "",
      phone: "",
      role: "admin",
      passwordHash: "pbkdf2-sha256$600000$qx0mO27GbUHd1ZvUgAS1iw==$IHdAHYEyCOJ8FI5di9bxGWCETtDxCJzMqng1tYDU4M4="
    }),
    Object.freeze({
      id: "usr-demo-maria",
      name: "María",
      username: "maria",
      email: "maria@demo.pe",
      phone: "",
      role: "cliente",
      passwordHash: "pbkdf2-sha256$600000$UZmbCy7Urq0edAD/PPZsZQ==$7kZpnpOjI/0PEB+7NgpPMntEUSXJcuGfkpeZBkDbPBg="
    }),
    Object.freeze({
      id: "usr-demo-juan",
      name: "Juan",
      username: "juan",
      email: "juan@demo.pe",
      phone: "",
      role: "cliente",
      passwordHash: "pbkdf2-sha256$600000$jTd8uu0pBCkY/8yuRIkmRw==$Rynv1aRH94fvcotYH3Q6I9Hvz8H8qlxzy+HxTkeczgU="
    })
  ]);

  const now = () => new Date().toISOString();
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const toCents = (amount) => Math.round(Number(amount) * 100);
  const fromCents = (cents) => Number((cents / 100).toFixed(2));
  const makeId = (prefix) => {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
      return `${prefix}-${globalThis.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  };

  class PBDataError extends Error {
    constructor(message, code = "DATA_ERROR") {
      super(message);
      this.name = "PBDataError";
      this.code = code;
    }
  }

  // Fallback de memoria: permite que la página siga funcionando en la pestaña
  // actual si el navegador bloquea localStorage. Al cerrar la pestaña se pierde.
  const memoryStorage = new Map();
  let storageMode = "localStorage";
  const storageWarnings = [];

  function getRaw(key) {
    try {
      const value = window.localStorage.getItem(key);
      storageMode = "localStorage";
      return value;
    } catch (error) {
      storageMode = "memoria temporal";
      return memoryStorage.has(key) ? memoryStorage.get(key) : null;
    }
  }

  function setRaw(key, value) {
    try {
      window.localStorage.setItem(key, value);
      storageMode = "localStorage";
      return;
    } catch (error) {
      storageMode = "memoria temporal";
      memoryStorage.set(key, value);
    }
  }

  function readJSON(key, fallback) {
    const raw = getRaw(key);
    if (raw === null) return clone(fallback);

    try {
      return JSON.parse(raw);
    } catch (error) {
      const warning = `No se pudo leer ${key}: el contenido guardado no es JSON válido.`;
      storageWarnings.push(warning);
      console.warn(`[PBData] ${warning}`);
      return clone(fallback);
    }
  }

  function writeJSON(key, value) {
    try {
      setRaw(key, JSON.stringify(value));
    } catch (error) {
      throw new PBDataError("No se pudieron guardar los datos en este navegador.", "STORAGE_WRITE_FAILED");
    }
  }

  function readArray(key) {
    const value = readJSON(key, []);
    if (!Array.isArray(value)) {
      const warning = `La clave ${key} no contiene una lista válida.`;
      storageWarnings.push(warning);
      console.warn(`[PBData] ${warning}`);
      return [];
    }
    return value;
  }

  function textValue(value, field, maxLength, required = true) {
    if (typeof value !== "string") {
      if (!required && (value === null || value === undefined)) return "";
      throw new PBDataError(`El campo ${field} no es válido.`, "INVALID_FIELD");
    }

    const result = value.trim();
    if (required && result.length === 0) {
      throw new PBDataError(`El campo ${field} es obligatorio.`, "REQUIRED_FIELD");
    }
    if (result.length > maxLength) {
      throw new PBDataError(`El campo ${field} supera el máximo de ${maxLength} caracteres.`, "FIELD_TOO_LONG");
    }
    return result;
  }

  function validateEmail(email) {
    const value = textValue(email, "correo", 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new PBDataError("Escribe un correo electrónico válido.", "INVALID_EMAIL");
    }
    return value;
  }

  function validatePhone(phone) {
    const value = textValue(phone, "teléfono", 20);
    const digitCount = value.replace(/\D/g, "").length;
    if (!/^[0-9+()\s-]{7,20}$/.test(value) || digitCount < 7) {
      throw new PBDataError("El teléfono debe contener al menos 7 dígitos y solo utilizar números o símbolos telefónicos permitidos.", "INVALID_PHONE");
    }
    return value;
  }

  function validateMoney(value, field = "precio") {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0.1 || amount > 9999) {
      throw new PBDataError(`El ${field} debe estar entre S/ 0.10 y S/ 9,999.00.`, "INVALID_PRICE");
    }
    return fromCents(toCents(amount));
  }

  function validateCategory(category) {
    if (!CATEGORIES.includes(category)) {
      throw new PBDataError("La categoría seleccionada no es válida.", "INVALID_CATEGORY");
    }
    return category;
  }

  function normalizeImagePath(value) {
    const image = textValue(value ?? "", "imagen", 500, false);
    if (!image) return "";

    // Se permiten rutas relativas del proyecto y URLs HTTP(S).
    if (/^(\.?\.?\/|img\/|assets\/)/i.test(image)) return image;
    try {
      const parsed = new URL(image);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
    } catch (error) {
      // La ruta no es relativa permitida ni una URL absoluta válida.
    }
    throw new PBDataError("La imagen debe usar una ruta local permitida o una URL HTTP/HTTPS.", "INVALID_IMAGE_URL");
  }

  function normalizeCustomizations(input = {}, customizable = true) {
    if (!customizable) return clone(DEFAULT_CUSTOMIZATIONS);

    const result = {};
    for (const [key, config] of Object.entries(CUSTOMIZATION_GROUPS)) {
      const selected = input[key] ?? "normal";
      if (!Object.prototype.hasOwnProperty.call(config, selected)) {
        throw new PBDataError(`La opción seleccionada para ${config.label.toLowerCase()} no es válida.`, "INVALID_CUSTOMIZATION");
      }
      result[key] = selected;
    }
    return result;
  }

  function customizationAdjustmentCents(customizations) {
    let adjustment = 0;
    for (const [key, selected] of Object.entries(customizations)) {
      const value = CUSTOMIZATION_GROUPS[key]?.[selected];
      if (typeof value !== "number") {
        throw new PBDataError("Se encontró una personalización no válida.", "INVALID_CUSTOMIZATION");
      }
      adjustment += toCents(value);
    }
    return adjustment;
  }

  // Fotografías locales del catálogo. Los archivos deben estar en img/products/.
  // Los créditos y enlaces se conservan para identificar las fuentes originales.
  const DEFAULT_PRODUCT_PRESENTATION = Object.freeze({
    "prod-pollo": {
      description: "Preparación completa de pollo al carbón.",
      image: "img/products/pollo.jpg",
      imageCredit: "MiguelAlanCS · CC BY-SA 4.0",
      imageSource: "https://commons.wikimedia.org/wiki/File:Pollo_a_la_brasa_con_arroz.jpg"
    },
    "prod-carne": {
      description: "Preparación completa a base de carne de res.",
      image: "img/products/carne.jpg",
      imageCredit: "PapiPijuan · CC BY-SA 4.0",
      imageSource: "https://commons.wikimedia.org/wiki/File:Estofado_de_carne.jpg"
    },
    "prod-mixto": {
      description: "Presentación completa en versión mixta.",
      image: "img/products/mixto.jpg",
      imageCredit: "Fotografía específica pendiente",
      imageSource: ""
    },
    "prod-chicha": {
      description: "Chicha morada en presentación de 1 litro.",
      image: "img/products/chicha-morada.jpg",
      imageCredit: "young shanahan · CC BY 2.0",
      imageSource: "https://commons.wikimedia.org/wiki/File:Chicha_Morada_2017.jpg"
    },
    "prod-inca-kola": {
      description: "Inca Kola en presentación de 500 ml.",
      image: "img/products/inca-kola.jpg",
      imageCredit: "Markus Leupold-Löwenthal · CC BY-SA 3.0",
      imageSource: "https://commons.wikimedia.org/wiki/File:IncaKolaBottleGlass.jpg"
    },
    "prod-agua": {
      description: "Agua mineral en presentación de 625 ml.",
      image: "img/products/agua-mineral.jpg",
      imageCredit: "Goldorak · CC BY-SA 4.0",
      imageSource: "https://commons.wikimedia.org/wiki/File:Botella_de_Agua_de_Solares.jpg"
    },
    "prod-papa-extra": {
      description: "Porción adicional de papas fritas.",
      image: "img/products/papa-extra.jpg",
      imageCredit: "Horacio Cambeiro · CC BY-SA 4.0",
      imageSource: "https://commons.wikimedia.org/wiki/File:Papas_fritas_(porci%C3%B3n_lista).jpg"
    },
    "prod-crema-extra": {
      description: "Porción adicional de cremas para acompañar.",
      image: "img/products/crema-extra.jpg",
      imageCredit: "Dtarazona · CC BY-SA 3.0 / GFDL 1.2+",
      imageSource: "https://commons.wikimedia.org/wiki/File:Cremas_del_Pollo_a_la_Brasa_(Peru).JPG"
    },
    "prod-ensalada-extra": {
      description: "Porción adicional de ensalada.",
      image: "img/products/ensalada-extra.jpg",
      imageCredit: "Horacio Cambeiro · CC BY-SA 4.0",
      imageSource: "https://commons.wikimedia.org/wiki/File:Ensalada_de_lechuga,_tomate_y_pepinos.jpg"
    }
  });

  function createDefaultProducts() {
    const createdAt = now();
    const rows = [
      ["prod-pollo", "Pelícano de pollo completo", "pelicanos", 14.00, true],
      ["prod-carne", "Pelícano de carne completo", "pelicanos", 16.00, true],
      ["prod-mixto", "Pelícano mixto completo", "pelicanos", 18.00, true],
      ["prod-chicha", "Chicha morada 1 L", "bebidas", 6.00, false],
      ["prod-inca-kola", "Inca Kola 500 ml", "bebidas", 4.00, false],
      ["prod-agua", "Agua mineral 625 ml", "bebidas", 2.50, false],
      ["prod-papa-extra", "Porción extra de papa", "extras", 3.00, false],
      ["prod-crema-extra", "Crema extra", "extras", 1.00, false],
      ["prod-ensalada-extra", "Ensalada extra", "extras", 2.00, false]
    ];

    return rows.map(([id, name, category, price, customizable]) => ({
      id,
      name,
      category,
      price,
      ...clone(DEFAULT_PRODUCT_PRESENTATION[id]),
      customizable,
      available: true,
      label: "",
      createdAt,
      updatedAt: createdAt
    }));
  }

  // Completa campos visuales de productos ya guardados por versiones anteriores.
  // No modifica precios, disponibilidad, categorías ni personalizaciones que el
  // administrador pudiera haber cambiado en su navegador.
  function migrateProductPresentation() {
    const products = readArray(STORAGE_KEYS.products);
    let changed = false;

    for (const product of products) {
      const defaults = DEFAULT_PRODUCT_PRESENTATION[product?.id];
      if (!defaults) continue;

      if (!String(product.description ?? "").trim() && defaults.description) {
        product.description = defaults.description;
        changed = true;
      }
      if (!String(product.image ?? "").trim() && defaults.image) {
        product.image = defaults.image;
        changed = true;
      }
      if (!String(product.imageCredit ?? "").trim() && defaults.imageCredit) {
        product.imageCredit = defaults.imageCredit;
        changed = true;
      }
      if (!String(product.imageSource ?? "").trim() && defaults.imageSource) {
        product.imageSource = defaults.imageSource;
        changed = true;
      }
    }

    if (changed) writeJSON(STORAGE_KEYS.products, products);
    return { changed, count: products.length };
  }

  function validatePassword(password) {
    if (typeof password !== "string") {
      throw new PBDataError("La contraseña no es válida.", "INVALID_PASSWORD");
    }
    if (password.length < 6) {
      throw new PBDataError("La contraseña debe tener al menos 6 caracteres.", "WEAK_PASSWORD");
    }
    if (password.length > 128) {
      throw new PBDataError("La contraseña no puede superar los 128 caracteres.", "PASSWORD_TOO_LONG");
    }
    return password;
  }

  function requireWebCrypto() {
    if (!globalThis.crypto?.subtle || typeof globalThis.crypto.getRandomValues !== "function") {
      throw new PBDataError(
        "Este navegador no habilita Web Crypto en este contexto. Abre el proyecto mediante http://localhost o GitHub Pages.",
        "WEB_CRYPTO_UNAVAILABLE"
      );
    }
  }

  function bytesToBase64(bytes) {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  async function derivePasswordBits(password, salt, iterations) {
    const keyMaterial = await globalThis.crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    return new Uint8Array(await globalThis.crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      keyMaterial,
      256
    ));
  }

  async function createPasswordHash(password) {
    const validPassword = validatePassword(password);
    requireWebCrypto();
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const derived = await derivePasswordBits(validPassword, salt, PASSWORD_HASH_ITERATIONS);
    return `${PASSWORD_HASH_PREFIX}$${PASSWORD_HASH_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(derived)}`;
  }

  async function verifyPasswordHash(password, storedHash) {
    validatePassword(password);
    requireWebCrypto();
    if (typeof storedHash !== "string") return false;

    const [algorithm, iterationText, saltText, expectedText, extra] = storedHash.split("$");
    const iterations = Number(iterationText);
    if (
      algorithm !== PASSWORD_HASH_PREFIX ||
      !Number.isInteger(iterations) ||
      iterations < 100000 ||
      iterations > 1000000 ||
      !saltText || !expectedText || extra !== undefined
    ) return false;

    try {
      const salt = base64ToBytes(saltText);
      const expected = base64ToBytes(expectedText);
      if (salt.length !== 16 || expected.length !== 32) return false;
      const actual = await derivePasswordBits(password, salt, iterations);
      let difference = actual.length ^ expected.length;
      for (let index = 0; index < actual.length; index += 1) {
        difference |= actual[index] ^ expected[index];
      }
      return difference === 0;
    } catch (error) {
      return false;
    }
  }

  function seedDemoAccounts() {
    const users = readArray(STORAGE_KEYS.users);
    let changed = false;

    for (const demoUser of DEMO_USERS) {
      const alreadyExists = users.some((user) => user && typeof user === "object" && (
        user.id === demoUser.id ||
        (user.role === demoUser.role && String(user.username ?? "").toLowerCase() === demoUser.username.toLowerCase()) ||
        (demoUser.email && user.role === demoUser.role && String(user.email ?? "").toLowerCase() === demoUser.email.toLowerCase())
      ));

      if (alreadyExists) continue;
      users.push({ ...demoUser, createdAt: now() });
      changed = true;
    }

    if (changed) writeJSON(STORAGE_KEYS.users, users);
    return { added: changed, count: users.length };
  }

  function seedDemoOrders() {
    const existingOrders = readArray(STORAGE_KEYS.orders);
    // Solo crear pedidos de prueba en una instalación nueva sin historial.
    if (existingOrders.length > 0) return { added: false, count: existingOrders.length };

    const users = readArray(STORAGE_KEYS.users);
    const products = readArray(STORAGE_KEYS.products);
    const maria = users.find((user) => user.id === "usr-demo-maria");
    const juan = users.find((user) => user.id === "usr-demo-juan");
    if (!maria || !juan) return { added: false, count: 0 };

    const productById = (productId) => products.find((product) => product.id === productId);
    const nowMs = Date.now();
    const minutes = 60 * 1000;
    const days = 24 * 60 * minutes;

    function buildDemoOrder({ id, code, user, productId, status, createdOffset, pickupOffset }) {
      const product = productById(productId);
      if (!product) return null;

      const createdDate = new Date(nowMs + createdOffset);
      const pickupDate = new Date(nowMs + pickupOffset);
      const createdAt = createdDate.toISOString();
      const pickupAt = pickupDate.toISOString();
      const item = calculateLine(product, 1, DEFAULT_CUSTOMIZATIONS);
      const events = [{
        id: makeId("evt"),
        type: "creacion",
        description: "Pedido de demostración registrado; pago pendiente.",
        from: null,
        to: "pendiente",
        actorRole: "cliente",
        actorId: user.id,
        createdAt
      }];

      const history = [];
      if (status === "en_preparacion") {
        history.push(["pendiente", "en_preparacion", "Pedido de demostración pasó a preparación.", 3 * minutes]);
      } else if (status === "entregado") {
        history.push(["pendiente", "en_preparacion", "Pedido de demostración pasó a preparación.", 3 * minutes]);
        history.push(["en_preparacion", "listo", "Pedido de demostración quedó listo.", 15 * minutes]);
        history.push(["listo", "entregado", "Pedido de demostración fue entregado.", 25 * minutes]);
      }

      for (const [from, to, description, elapsed] of history) {
        events.push({
          id: makeId("evt"),
          type: "cambio_estado",
          description,
          from,
          to,
          actorRole: "admin",
          actorId: "usr-demo-admin",
          createdAt: new Date(createdDate.getTime() + elapsed).toISOString()
        });
      }

      return {
        id,
        code,
        userId: user.id,
        customer: { name: user.name, email: user.email, phone: user.phone },
        items: [item],
        total: item.lineTotal,
        paymentMethod: "efectivo",
        paymentStatus: "pendiente",
        status,
        pickupAt,
        phone: user.phone,
        note: "Pedido de demostración",
        createdAt,
        updatedAt: events[events.length - 1].createdAt,
        events
      };
    }

    const demoOrders = [
      buildDemoOrder({
        id: "ord-demo-maria-pendiente", code: "PB-0001", user: maria,
        productId: "prod-pollo", status: "pendiente",
        createdOffset: -5 * minutes, pickupOffset: 30 * minutes
      }),
      buildDemoOrder({
        id: "ord-demo-maria-entregado", code: "PB-0002", user: maria,
        productId: "prod-chicha", status: "entregado",
        createdOffset: -2 * days - 45 * minutes, pickupOffset: -2 * days
      }),
      buildDemoOrder({
        id: "ord-demo-juan-preparacion", code: "PB-0003", user: juan,
        productId: "prod-carne", status: "en_preparacion",
        createdOffset: -12 * minutes, pickupOffset: 25 * minutes
      }),
      buildDemoOrder({
        id: "ord-demo-juan-entregado", code: "PB-0004", user: juan,
        productId: "prod-agua", status: "entregado",
        createdOffset: -1 * days - 45 * minutes, pickupOffset: -1 * days
      })
    ].filter(Boolean);

    writeJSON(STORAGE_KEYS.orders, demoOrders);
    writeJSON(STORAGE_KEYS.orderCounter, Math.max(4, Number(readJSON(STORAGE_KEYS.orderCounter, 0)) || 0));
    return { added: true, count: demoOrders.length };
  }

  function initialize() {
    const defaults = [
      [STORAGE_KEYS.users, []],
      [STORAGE_KEYS.products, createDefaultProducts()],
      [STORAGE_KEYS.orders, []],
      [STORAGE_KEYS.customerSession, null],
      [STORAGE_KEYS.adminSession, null],
      [STORAGE_KEYS.orderCounter, 0],
      [STORAGE_KEYS.cart, { userId: null, items: [], updatedAt: now() }]
    ];

    for (const [key, defaultValue] of defaults) {
      if (getRaw(key) === null) writeJSON(key, defaultValue);
    }

    // El catálogo es obligatorio en esta demostración: si una versión anterior
    // dejó la clave creada pero con una lista vacía, recuperar los nueve productos.
    // No se sobrescribe un catálogo existente con precios o disponibilidad editados.
    if (readArray(STORAGE_KEYS.products).length === 0) {
      writeJSON(STORAGE_KEYS.products, createDefaultProducts());
    }

    seedDemoAccounts();
    seedDemoOrders();
    migrateProductPresentation();
    return getStorageInfo();
  }

  function getStorageInfo() {
    return {
      mode: storageMode,
      persistent: storageMode === "localStorage",
      warnings: [...storageWarnings]
    };
  }

  function getProducts({ category = null, availableOnly = false } = {}) {
    let products = readArray(STORAGE_KEYS.products);
    if (category && category !== "todos") products = products.filter((item) => item.category === category);
    if (availableOnly) products = products.filter((item) => item.available === true);
    return clone(products);
  }

  function getProductById(productId) {
    const product = readArray(STORAGE_KEYS.products).find((item) => item.id === productId);
    return product ? clone(product) : null;
  }

  function saveProduct(input) {
    requireAdminSession();
    if (!input || typeof input !== "object" || typeof input.id !== "string" || !input.id) {
      throw new PBDataError("Selecciona un producto existente para editarlo.", "INVALID_PRODUCT");
    }

    const products = readArray(STORAGE_KEYS.products);
    const existingIndex = products.findIndex((item) => item.id === input.id);
    if (existingIndex < 0) {
      throw new PBDataError("No se encontró el producto que intentas editar.", "PRODUCT_NOT_FOUND");
    }

    const previous = products[existingIndex];
    const timestamp = now();
    const product = {
      ...previous,
      name: textValue(input.name ?? previous.name, "nombre del producto", 100),
      category: validateCategory(input.category ?? previous.category),
      price: validateMoney(input.price),
      image: normalizeImagePath(input.image ?? previous.image ?? ""),
      imageCredit: textValue(input.imageCredit ?? previous.imageCredit ?? "", "crédito de imagen", 160, false),
      imageSource: normalizeImagePath(input.imageSource ?? previous.imageSource ?? ""),
      description: textValue(input.description ?? previous.description ?? "", "descripción", 300, false),
      customizable: typeof input.customizable === "boolean" ? input.customizable : Boolean(previous.customizable),
      available: typeof input.available === "boolean" ? input.available : previous.available,
      label: textValue(input.label ?? previous.label ?? "", "etiqueta", 40, false),
      updatedAt: timestamp
    };

    products[existingIndex] = product;
    writeJSON(STORAGE_KEYS.products, products);
    return clone(product);
  }

  // RF-13: actualiza solo el precio base y la disponibilidad del producto existente.
  // La identidad y el resto de sus datos (incluida la fotografía local) se conservan.
  function updateProductCatalog({ id, price, available }) {
    requireAdminSession();
    if (typeof available !== "boolean") {
      throw new PBDataError("Selecciona una disponibilidad válida.", "INVALID_AVAILABILITY");
    }
    const current = getProductById(id);
    if (!current) throw new PBDataError("No se encontró el producto seleccionado.", "PRODUCT_NOT_FOUND");
    return saveProduct({ ...current, price, available });
  }

  // RF-13: restaura el catálogo de nueve productos de la demostración.
  // También restaura precios y disponibilidad inicial, conservando los IDs y
  // las rutas de imágenes locales declaradas en DEFAULT_PRODUCT_PRESENTATION.
  function restoreOriginalMenu() {
    requireAdminSession();
    const currentProducts = readArray(STORAGE_KEYS.products);
    const currentById = new Map(currentProducts.map((product) => [product.id, product]));
    const timestamp = now();
    const restored = createDefaultProducts().map((product) => {
      const previous = currentById.get(product.id);
      return {
        ...product,
        createdAt: previous?.createdAt || product.createdAt,
        updatedAt: timestamp
      };
    });
    writeJSON(STORAGE_KEYS.products, restored);
    return clone(restored);
  }

  function getUsers() {
    // Nunca devolver el hash de contraseña a las vistas.
    return readArray(STORAGE_KEYS.users)
      .filter((user) => user && typeof user === "object")
      .map(({ passwordHash, ...publicUser }) => publicUser);
  }

  function getUserById(userId) {
    const user = readArray(STORAGE_KEYS.users).find((item) => item && item.id === userId);
    if (!user) return null;
    const { passwordHash, ...publicUser } = user;
    return clone(publicUser);
  }

  async function createCustomer({ name, email, phone, password }) {
    const users = readArray(STORAGE_KEYS.users);
    const normalizedEmail = validateEmail(email);
    const normalizedName = textValue(name, "nombre", 100);
    const normalizedPhone = validatePhone(phone);
    validatePassword(password);
    if (users.some((user) => user && user.email?.toLowerCase() === normalizedEmail)) {
      throw new PBDataError("Ya existe una cuenta registrada con ese correo.", "EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await createPasswordHash(password);
    // Releer luego del hash para evitar duplicados si dos formularios se envían casi a la vez.
    const latestUsers = readArray(STORAGE_KEYS.users);
    if (latestUsers.some((user) => user && user.email?.toLowerCase() === normalizedEmail)) {
      throw new PBDataError("Ya existe una cuenta registrada con ese correo.", "EMAIL_ALREADY_EXISTS");
    }
    const user = {
      id: makeId("usr"),
      name: normalizedName,
      // El documento no solicita un nombre de usuario al registrarse.
      // Por eso las cuentas nuevas inician sesión usando su correo.
      username: null,
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
      role: "cliente",
      createdAt: now()
    };

    latestUsers.push(user);
    writeJSON(STORAGE_KEYS.users, latestUsers);
    const { passwordHash: omitted, ...publicUser } = user;
    return clone(publicUser);
  }

  async function authenticateCustomer({ identifier, password }) {
    validatePassword(password);
    const normalizedIdentifier = textValue(identifier, "usuario o correo", 254).toLowerCase();
    const users = readArray(STORAGE_KEYS.users);
    const user = users.find((item) => item &&
      item.role === "cliente" && (
        item.email?.toLowerCase() === normalizedIdentifier ||
        item.username?.toLowerCase() === normalizedIdentifier
      )
    );

    if (!user || !(await verifyPasswordHash(password, user.passwordHash))) {
      throw new PBDataError("Usuario/correo o contraseña incorrectos.", "INVALID_CREDENTIALS");
    }

    const { passwordHash: omitted, ...publicUser } = user;
    return clone(publicUser);
  }

  async function authenticateAdmin({ username, password }) {
    validatePassword(password);
    const normalizedUsername = textValue(username, "usuario", 60).toLowerCase();
    const users = readArray(STORAGE_KEYS.users);
    const user = users.find((item) => item &&
      item.role === "admin" && item.username?.toLowerCase() === normalizedUsername
    );

    if (!user || !(await verifyPasswordHash(password, user.passwordHash))) {
      throw new PBDataError("Usuario o contraseña administrativos incorrectos.", "INVALID_CREDENTIALS");
    }

    const { passwordHash: omitted, ...publicUser } = user;
    return clone(publicUser);
  }

  function setCustomerSession(userId) {
    const user = readArray(STORAGE_KEYS.users).find((item) => item.id === userId && item.role === "cliente");
    if (!user) throw new PBDataError("No se encontró una cuenta de cliente válida.", "INVALID_CUSTOMER_SESSION");

    // La sesión de cliente es independiente de la sesión administrativa.
    // Esto permite probar tienda y panel en pestañas distintas del mismo origen.
    writeJSON(STORAGE_KEYS.customerSession, user.id);

    const cart = readJSON(STORAGE_KEYS.cart, { userId: null, items: [], updatedAt: now() });
    if (cart.userId && cart.userId !== user.id) {
      writeJSON(STORAGE_KEYS.cart, { userId: user.id, items: [], updatedAt: now() });
    } else {
      writeJSON(STORAGE_KEYS.cart, { ...cart, userId: user.id, updatedAt: now() });
    }
  }

  function getCustomerSession() {
    const userId = readJSON(STORAGE_KEYS.customerSession, null);
    const user = readArray(STORAGE_KEYS.users).find((item) => item.id === userId && item.role === "cliente");
    return user ? getUserById(user.id) : null;
  }

  function clearCustomerSession() {
    writeJSON(STORAGE_KEYS.customerSession, null);
    writeJSON(STORAGE_KEYS.cart, { userId: null, items: [], updatedAt: now() });
  }

  function setAdminSession(userId) {
    const user = readArray(STORAGE_KEYS.users).find((item) => item.id === userId && item.role === "admin");
    if (!user) throw new PBDataError("No se encontró una cuenta administrativa válida.", "INVALID_ADMIN_SESSION");

    // La sesión administrativa es independiente de la sesión del cliente.
    // Iniciar administración no debe cerrar la tienda ni vaciar el carrito.
    writeJSON(STORAGE_KEYS.adminSession, user.id);
  }

  function getAdminSession() {
    const userId = readJSON(STORAGE_KEYS.adminSession, null);
    const user = readArray(STORAGE_KEYS.users).find((item) => item.id === userId && item.role === "admin");
    return user ? getUserById(user.id) : null;
  }

  // Las operaciones administrativas requieren una sesión con rol admin.
  // Es un control de consistencia para la demo local, no autorización de producción.
  function requireAdminSession() {
    const admin = getAdminSession();
    if (!admin) {
      throw new PBDataError("Inicia sesión como administrador para realizar esta operación.", "ADMIN_REQUIRED");
    }
    return admin;
  }

  function clearAdminSession() {
    writeJSON(STORAGE_KEYS.adminSession, null);
  }

  function getCart() {
    const cart = readJSON(STORAGE_KEYS.cart, { userId: null, items: [], updatedAt: now() });
    return {
      userId: cart.userId ?? null,
      items: Array.isArray(cart.items) ? clone(cart.items) : [],
      updatedAt: cart.updatedAt ?? null
    };
  }

  function writeCart(cart) {
    const safeCart = {
      userId: cart.userId ?? null,
      items: cart.items,
      updatedAt: now()
    };
    writeJSON(STORAGE_KEYS.cart, safeCart);
    return clone(safeCart);
  }

  function addCartItem(productId, quantity = 1, customizations = {}) {
    const product = getProductById(productId);
    if (!product) throw new PBDataError("El producto seleccionado ya no existe.", "PRODUCT_NOT_FOUND");
    if (!product.available) throw new PBDataError("Este producto está agotado y no se puede agregar.", "PRODUCT_UNAVAILABLE");

    const amount = Number(quantity);
    if (!Number.isInteger(amount) || amount < 1 || amount > 99) {
      throw new PBDataError("La cantidad debe ser un número entero entre 1 y 99.", "INVALID_QUANTITY");
    }

    const normalized = normalizeCustomizations(customizations, product.customizable);
    const cart = getCart();
    const session = getCustomerSession();
    const currentUserId = session?.id ?? null;

    if (cart.userId && currentUserId && cart.userId !== currentUserId) {
      cart.items = [];
    }
    cart.userId = currentUserId;

    const existing = cart.items.find((item) =>
      item.productId === productId && JSON.stringify(item.customizations) === JSON.stringify(normalized)
    );

    if (existing) {
      if (existing.quantity + amount > 99) {
        throw new PBDataError("No puedes agregar más de 99 unidades del mismo producto.", "QUANTITY_LIMIT");
      }
      existing.quantity += amount;
    } else {
      cart.items.push({
        id: makeId("cart"),
        productId,
        quantity: amount,
        customizations: normalized
      });
    }

    return writeCart(cart);
  }

  function updateCartQuantity(itemId, quantity) {
    const amount = Number(quantity);
    if (!Number.isInteger(amount) || amount < 1 || amount > 99) {
      throw new PBDataError("La cantidad debe ser un número entero entre 1 y 99.", "INVALID_QUANTITY");
    }

    const cart = getCart();
    const item = cart.items.find((row) => row.id === itemId);
    if (!item) throw new PBDataError("No se encontró el artículo del carrito.", "CART_ITEM_NOT_FOUND");

    const product = getProductById(item.productId);
    if (!product && amount > Number(item.quantity)) {
      throw new PBDataError("Este producto ya no está disponible. Puedes quitarlo del carrito.", "PRODUCT_NOT_FOUND");
    }
    if (product && !product.available && amount > Number(item.quantity)) {
      throw new PBDataError("Este producto está agotado. Puedes reducir su cantidad o quitarlo del carrito.", "PRODUCT_UNAVAILABLE");
    }

    item.quantity = amount;
    return writeCart(cart);
  }

  function removeCartItem(itemId) {
    const cart = getCart();
    const nextItems = cart.items.filter((item) => item.id !== itemId);
    if (nextItems.length === cart.items.length) {
      throw new PBDataError("No se encontró el artículo del carrito.", "CART_ITEM_NOT_FOUND");
    }
    cart.items = nextItems;
    return writeCart(cart);
  }

  function clearCart() {
    const session = getCustomerSession();
    return writeCart({ userId: session?.id ?? null, items: [] });
  }

  function calculateLine(product, quantity, customizations = {}) {
    const amount = Number(quantity);
    if (!Number.isInteger(amount) || amount < 1 || amount > 99) {
      throw new PBDataError("La cantidad de un artículo no es válida.", "INVALID_QUANTITY");
    }

    const normalized = normalizeCustomizations(customizations, product.customizable === true);
    const baseCents = toCents(product.price);
    const adjustmentCents = product.customizable ? customizationAdjustmentCents(normalized) : 0;
    const unitCents = baseCents + adjustmentCents;

    if (unitCents < 0) throw new PBDataError("El precio calculado no puede ser negativo.", "NEGATIVE_PRICE");

    return {
      productId: product.id,
      name: product.name,
      category: product.category,
      image: product.image || "",
      quantity: amount,
      customizable: product.customizable === true,
      customizations: normalized,
      baseUnitPrice: fromCents(baseCents),
      customizationAdjustment: fromCents(adjustmentCents),
      unitPrice: fromCents(unitCents),
      lineTotal: fromCents(unitCents * amount),
      available: product.available === true
    };
  }

  function calculateCart() {
    const cart = getCart();
    const lines = [];
    const issues = [];

    for (const item of cart.items) {
      const product = getProductById(item.productId);
      const safeQuantity = Number.isInteger(Number(item.quantity)) && Number(item.quantity) >= 1 && Number(item.quantity) <= 99
        ? Number(item.quantity)
        : 1;

      if (!product) {
        issues.push("Hay un producto del carrito que ya no existe. Elimínalo para continuar.");
        lines.push({
          cartItemId: item.id,
          productId: item.productId,
          name: "Producto no disponible",
          category: "extras",
          image: "",
          quantity: safeQuantity,
          customizable: false,
          customizations: {},
          baseUnitPrice: 0,
          customizationAdjustment: 0,
          unitPrice: 0,
          lineTotal: 0,
          available: false
        });
        continue;
      }

      try {
        const line = calculateLine(product, item.quantity, item.customizations);
        lines.push({ ...line, cartItemId: item.id });
        if (!line.available) issues.push(`${line.name} está agotado. Puedes quitarlo del carrito.`);
      } catch (error) {
        issues.push(`${product.name}: ${error.message || "revisa este artículo del carrito."}`);
        lines.push({
          cartItemId: item.id,
          productId: item.productId,
          name: product.name,
          category: product.category,
          image: product.image || "",
          quantity: safeQuantity,
          customizable: product.customizable === true,
          customizations: {},
          baseUnitPrice: fromCents(toCents(product.price)),
          customizationAdjustment: 0,
          unitPrice: 0,
          lineTotal: 0,
          available: false
        });
      }
    }

    const totalCents = lines.reduce((sum, line) => sum + toCents(line.lineTotal), 0);
    const units = lines.reduce((sum, line) => sum + line.quantity, 0);

    return {
      items: lines,
      units,
      subtotal: fromCents(totalCents),
      total: fromCents(totalCents),
      issues
    };
  }

  function getOrders({ userId = null, status = null, paymentStatus = null, date = null, search = "" } = {}) {
    let orders = readArray(STORAGE_KEYS.orders);
    if (userId) orders = orders.filter((order) => order.userId === userId);
    if (status && status !== "todos") orders = orders.filter((order) => order.status === status);
    if (paymentStatus && paymentStatus !== "todos") orders = orders.filter((order) => order.paymentStatus === paymentStatus);
    if (date) orders = orders.filter((order) => {
      const pickup = new Date(order.pickupAt);
      if (Number.isNaN(pickup.getTime())) return false;
      const localDate = [pickup.getFullYear(), String(pickup.getMonth() + 1).padStart(2, "0"), String(pickup.getDate()).padStart(2, "0")].join("-");
      return localDate === date;
    });

    const term = String(search).trim().toLowerCase();
    if (term) {
      orders = orders.filter((order) => [
        order.code,
        order.customer?.name,
        order.customer?.email,
        order.phone
      ].some((value) => String(value ?? "").toLowerCase().includes(term)));
    }

    return clone(orders.sort((a, b) => String(a.pickupAt).localeCompare(String(b.pickupAt))));
  }

  // Lista completa para el panel administrativo, disponible solo con sesión admin.
  function getAdminOrders(filters = {}) {
    requireAdminSession();
    return getOrders(filters);
  }


  // RF-12: resumen de clientes para administración. No expone hashes de contraseña.
  function getAdminCustomers() {
    requireAdminSession();
    const users = readArray(STORAGE_KEYS.users);
    const orders = readArray(STORAGE_KEYS.orders);

    const customers = users
      .filter((user) => user && user.role === "cliente")
      .map((user) => {
        const customerOrders = orders
          .filter((order) => order && order.userId === user.id)
          .sort((a, b) => {
            const aDate = Date.parse(a.createdAt || a.pickupAt || "") || 0;
            const bDate = Date.parse(b.createdAt || b.pickupAt || "") || 0;
            return bDate - aDate;
          });

        // Los pedidos cancelados no se incluyen en los totales históricos de ventas.
        const paidTotalCents = customerOrders
          .filter((order) => order.paymentStatus === "pagado" && order.status !== "cancelado")
          .reduce((sum, order) => sum + toCents(Number(order.total) || 0), 0);
        const latest = customerOrders[0] || null;
        const { passwordHash, ...publicCustomer } = user;

        return {
          ...publicCustomer,
          orderCount: customerOrders.length,
          paidTotal: fromCents(paidTotalCents),
          lastOrder: latest ? {
            id: latest.id,
            code: latest.code,
            status: latest.status,
            createdAt: latest.createdAt,
            pickupAt: latest.pickupAt
          } : null
        };
      })
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "es"));

    return clone(customers);
  }

  // RF-12: historial completo de un cliente desde una sesión administrativa.
  function getAdminCustomerHistory(customerId) {
    requireAdminSession();
    const user = readArray(STORAGE_KEYS.users).find((item) =>
      item && item.id === customerId && item.role === "cliente"
    );
    if (!user) throw new PBDataError("No se encontró el cliente seleccionado.", "CUSTOMER_NOT_FOUND");

    const orders = readArray(STORAGE_KEYS.orders)
      .filter((order) => order && order.userId === user.id)
      .sort((a, b) => {
        const aDate = Date.parse(a.createdAt || a.pickupAt || "") || 0;
        const bDate = Date.parse(b.createdAt || b.pickupAt || "") || 0;
        return bDate - aDate;
      });
    const { passwordHash, ...publicCustomer } = user;
    return clone({ customer: publicCustomer, orders });
  }

  // Historial del cliente: nunca acepta un userId recibido desde la interfaz.
  // La identidad se obtiene de la sesión activa y solo devuelve sus pedidos.
  function getCustomerOrders() {
    const customer = getCustomerSession();
    if (!customer) return [];

    const orders = readArray(STORAGE_KEYS.orders)
      .filter((order) => order && order.userId === customer.id);

    return clone(orders.sort((a, b) => {
      const aTime = Date.parse(a.createdAt || a.pickupAt || "") || 0;
      const bTime = Date.parse(b.createdAt || b.pickupAt || "") || 0;
      return bTime - aTime;
    }));
  }

  // Consulta puntual protegida por la misma sesión; útil para futuras vistas de detalle.
  function getCustomerOrderById(orderId) {
    const customer = getCustomerSession();
    if (!customer) return null;

    const order = readArray(STORAGE_KEYS.orders).find((item) =>
      item && item.id === orderId && item.userId === customer.id
    );
    return order ? clone(order) : null;
  }

  function getOrderById(orderId) {
    requireAdminSession();
    const order = readArray(STORAGE_KEYS.orders).find((item) => item.id === orderId);
    return order ? clone(order) : null;
  }

  function getOrderByCode(code) {
    requireAdminSession();
    const order = readArray(STORAGE_KEYS.orders).find((item) => item.code === code);
    return order ? clone(order) : null;
  }

  function createOrder({ userId, pickupAt, phone, paymentMethod, note = "" }) {
    const session = getCustomerSession();
    if (!session || session.id !== userId) {
      throw new PBDataError("Inicia sesión con la cuenta que realizará el pedido.", "CUSTOMER_REQUIRED");
    }

    const user = readArray(STORAGE_KEYS.users).find((item) => item.id === userId && item.role === "cliente");
    if (!user) {
      throw new PBDataError("No se encontró una cuenta de cliente válida.", "CUSTOMER_REQUIRED");
    }

    const cart = getCart();
    if (!Array.isArray(cart.items) || cart.items.length === 0) {
      throw new PBDataError("Agrega al menos un producto antes de confirmar el pedido.", "EMPTY_ORDER");
    }
    if (cart.userId !== user.id) {
      throw new PBDataError("El carrito no pertenece a la sesión actual. Vuelve a iniciar sesión.", "CART_USER_MISMATCH");
    }

    const pickupValue = textValue(pickupAt, "fecha y hora de recojo", 40);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(pickupValue)) {
      throw new PBDataError("Selecciona una fecha y hora de recojo válidas.", "INVALID_PICKUP_DATE");
    }
    const pickupDate = new Date(pickupValue);
    const pickupParts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(pickupValue);
    const expectedParts = pickupParts ? pickupParts.slice(1).map((part) => Number(part || 0)) : null;
    const isValidLocalDate = Boolean(
      expectedParts &&
      !Number.isNaN(pickupDate.getTime()) &&
      pickupDate.getFullYear() === expectedParts[0] &&
      pickupDate.getMonth() + 1 === expectedParts[1] &&
      pickupDate.getDate() === expectedParts[2] &&
      pickupDate.getHours() === expectedParts[3] &&
      pickupDate.getMinutes() === expectedParts[4] &&
      pickupDate.getSeconds() === expectedParts[5]
    );
    if (!isValidLocalDate) {
      throw new PBDataError("La fecha y hora de recojo no son válidas.", "INVALID_PICKUP_DATE");
    }
    if (pickupDate.getTime() < Date.now() + 10 * 60 * 1000) {
      throw new PBDataError("La hora de recojo debe tener al menos 10 minutos de anticipación.", "PICKUP_TOO_SOON");
    }

    const contactPhone = validatePhone(phone);
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      throw new PBDataError("Selecciona un método de pago válido.", "INVALID_PAYMENT_METHOD");
    }
    const kitchenNote = textValue(note, "nota para cocina", 300, false);

    const products = readArray(STORAGE_KEYS.products);
    const orderItems = cart.items.map((cartItem) => {
      const product = products.find((item) => item.id === cartItem.productId);
      if (!product) {
        throw new PBDataError("Uno de los productos del carrito ya no existe. Elimínalo antes de continuar.", "PRODUCT_NOT_FOUND");
      }
      if (!product.available) {
        throw new PBDataError(`${product.name} ya no está disponible. Elimínalo antes de continuar.`, "PRODUCT_UNAVAILABLE");
      }
      return calculateLine(product, cartItem.quantity, cartItem.customizations);
    });

    const totalCents = orderItems.reduce((sum, item) => sum + toCents(item.lineTotal), 0);
    if (totalCents <= 0) {
      throw new PBDataError("El total del pedido debe ser mayor que cero.", "INVALID_ORDER_TOTAL");
    }

    const orders = readArray(STORAGE_KEYS.orders);
    const storedCounter = Number(readJSON(STORAGE_KEYS.orderCounter, 0));
    const highestExistingCode = orders.reduce((highest, order) => {
      const match = /^PB-(\d+)$/.exec(String(order.code || ""));
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);
    let nextNumber = Math.max(
      Number.isSafeInteger(storedCounter) && storedCounter >= 0 ? storedCounter : 0,
      highestExistingCode
    ) + 1;
    let code = `PB-${String(nextNumber).padStart(4, "0")}`;
    while (orders.some((order) => order.code === code)) {
      nextNumber += 1;
      code = `PB-${String(nextNumber).padStart(4, "0")}`;
    }

    const timestamp = now();
    const order = {
      id: makeId("ord"),
      code,
      userId: user.id,
      customer: {
        name: user.name,
        email: user.email,
        phone: user.phone
      },
      items: orderItems,
      total: fromCents(totalCents),
      paymentMethod,
      paymentStatus: "pendiente",
      status: "pendiente",
      pickupAt: pickupDate.toISOString(),
      phone: contactPhone,
      note: kitchenNote,
      createdAt: timestamp,
      updatedAt: timestamp,
      events: [{
        id: makeId("evt"),
        type: "creacion",
        description: "Pedido registrado. Estado inicial: recibido; pago pendiente.",
        from: null,
        to: "pendiente",
        actorRole: "cliente",
        actorId: user.id,
        createdAt: timestamp
      }]
    };

    orders.push(order);
    writeJSON(STORAGE_KEYS.orders, orders);
    writeJSON(STORAGE_KEYS.orderCounter, nextNumber);
    clearCart();
    return clone(order);
  }

  function updateOrderStatus(orderId, nextStatus) {
    const admin = requireAdminSession();
    if (!ORDER_STATUSES.includes(nextStatus)) {
      throw new PBDataError("El estado indicado no es válido.", "INVALID_ORDER_STATUS");
    }

    const orders = readArray(STORAGE_KEYS.orders);
    const index = orders.findIndex((order) => order.id === orderId);
    if (index < 0) throw new PBDataError("No se encontró el pedido.", "ORDER_NOT_FOUND");

    const order = orders[index];
    const allowed = ORDER_TRANSITIONS[order.status] || [];
    if (!allowed.includes(nextStatus)) {
      throw new PBDataError(`No se puede cambiar el pedido de ${ORDER_STATUS_LABELS[order.status] || order.status} a ${ORDER_STATUS_LABELS[nextStatus]}.`, "INVALID_STATUS_TRANSITION");
    }

    const timestamp = now();
    if (!Array.isArray(order.events)) order.events = [];
    order.events.push({
      id: makeId("evt"),
      type: "cambio_estado",
      description: `Estado cambiado a ${ORDER_STATUS_LABELS[nextStatus]}.`,
      from: order.status,
      to: nextStatus,
      actorRole: "admin",
      actorId: admin.id,
      createdAt: timestamp
    });
    order.status = nextStatus;
    order.updatedAt = timestamp;
    orders[index] = order;
    writeJSON(STORAGE_KEYS.orders, orders);
    return clone(order);
  }

  function updatePaymentStatus(orderId, nextPaymentStatus) {
    const admin = requireAdminSession();
    if (!PAYMENT_STATUSES.includes(nextPaymentStatus)) {
      throw new PBDataError("El estado de pago indicado no es válido.", "INVALID_PAYMENT_STATUS");
    }

    const orders = readArray(STORAGE_KEYS.orders);
    const index = orders.findIndex((order) => order.id === orderId);
    if (index < 0) throw new PBDataError("No se encontró el pedido.", "ORDER_NOT_FOUND");

    const order = orders[index];

    // Un pedido cancelado no admite verificaciones ni correcciones posteriores
    // de pago. El estado de pago que tuviera al cancelarse queda como registro.
    if (order.status === "cancelado") {
      throw new PBDataError(
        "No se puede verificar ni modificar el pago de un pedido cancelado.",
        "CANCELLED_ORDER_PAYMENT_LOCKED"
      );
    }

    if (order.paymentStatus === nextPaymentStatus) return clone(order);

    const previousStatus = order.paymentStatus;
    const timestamp = now();
    order.paymentStatus = nextPaymentStatus;
    order.updatedAt = timestamp;
    if (!Array.isArray(order.events)) order.events = [];
    order.events.push({
      id: makeId("evt"),
      type: "pago",
      description: nextPaymentStatus === "pagado" ? "Pago verificado y marcado como pagado." : "Pago marcado como pendiente.",
      from: previousStatus,
      to: nextPaymentStatus,
      actorRole: "admin",
      actorId: admin.id,
      createdAt: timestamp
    });

    orders[index] = order;
    writeJSON(STORAGE_KEYS.orders, orders);
    return clone(order);
  }

  function getPublicConfig() {
    return clone({
      categories: CATEGORIES,
      paymentMethods: PAYMENT_METHODS,
      paymentStatuses: PAYMENT_STATUSES,
      orderStatuses: ORDER_STATUSES,
      orderStatusLabels: ORDER_STATUS_LABELS,
      orderTransitions: ORDER_TRANSITIONS,
      customizationGroups: CUSTOMIZATION_GROUPS,
      defaultCustomizations: DEFAULT_CUSTOMIZATIONS
    });
  }

  initialize();

  window.PBData = Object.freeze({
    STORAGE_KEYS,
    PBDataError,
    initialize,
    getStorageInfo,
    getPublicConfig,
    getProducts,
    getProductById,
    saveProduct,
    updateProductCatalog,
    restoreOriginalMenu,
    migrateProductPresentation,
    getUsers,
    getUserById,
    seedDemoAccounts,
    seedDemoOrders,
    createCustomer,
    authenticateCustomer,
    authenticateAdmin,
    setCustomerSession,
    getCustomerSession,
    clearCustomerSession,
    setAdminSession,
    getAdminSession,
    clearAdminSession,
    getCart,
    addCartItem,
    updateCartQuantity,
    removeCartItem,
    clearCart,
    calculateLine,
    calculateCart,
    getAdminOrders,
    getAdminCustomers,
    getAdminCustomerHistory,
    getCustomerOrders,
    getCustomerOrderById,
    getOrderById,
    getOrderByCode,
    createOrder,
    updateOrderStatus,
    updatePaymentStatus
  });
})();
