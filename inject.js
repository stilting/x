(async function() {
   const PLUGIN_URL = 'https://raw.githubusercontent.com/stilting/x/refs/heads/main/index.jsx';
   
   try {
      console.log('[Message Cleaner] Iniciando carregamento...');
      
      if (!window.equicord) {
         throw new Error('Equicord não está disponível. Certifique-se de que o Equicord está instalado e ativo.');
      }
      
      console.log('[Message Cleaner] Equicord detectado, carregando plugin...');
      
      const response = await fetch(PLUGIN_URL);
      if (!response.ok) {
         throw new Error(`Erro ao carregar plugin: ${response.status} ${response.statusText}`);
      }
      
      const pluginCode = await response.text();
      console.log('[Message Cleaner] Código do plugin carregado, compilando...');
      
      const moduleExports = {};
      const module = { exports: moduleExports };
      
      const require = (path) => {
         if (path.startsWith('equicord/')) {
            if (window.equicord?.webpack?.require) {
               return window.equicord.webpack.require(path);
            }
            if (window.equicord?.require) {
               return window.equicord.require(path);
            }
            if (window.require) {
               return window.require(path);
            }
            console.warn(`[Message Cleaner] Não foi possível carregar: ${path}, tentando método alternativo...`);
            return {};
         }
         throw new Error(`[Message Cleaner] Módulo não encontrado: ${path}`);
      };
      
      const pluginFactory = new Function(
         'require',
         'module',
         'exports',
         'equicord',
         `
         ${pluginCode}
         return module.exports || exports;
         `
      );
      
      const PluginClass = pluginFactory(require, module, module.exports, window.equicord);
      
      if (!PluginClass || typeof PluginClass !== 'function') {
         throw new Error('[Message Cleaner] Plugin não exportou uma classe válida. Verifique se o arquivo exporta uma classe que estende Plugin.');
      }
      
      console.log('[Message Cleaner] Classe do plugin carregada, criando instância...');
      
      const pluginInstance = new PluginClass();
      pluginInstance.entityID = 'message-cleaner';
      
      pluginInstance.settings = {
         get: (key, defaultValue) => {
            try {
               const stored = localStorage.getItem(`equicord_message-cleaner_${key}`);
               return stored !== null ? JSON.parse(stored) : defaultValue;
            } catch (e) {
               console.warn(`[Message Cleaner] Erro ao ler configuração ${key}:`, e);
               return defaultValue;
            }
         },
         set: (key, value) => {
            try {
               localStorage.setItem(`equicord_message-cleaner_${key}`, JSON.stringify(value));
            } catch (e) {
               console.error(`[Message Cleaner] Erro ao salvar configuração ${key}:`, e);
            }
         }
      };
      
      pluginInstance.log = (...args) => {
         console.log('[Message Cleaner]', ...args);
      };
      
      console.log('[Message Cleaner] Iniciando plugin...');
      
      if (typeof pluginInstance.startPlugin === 'function') {
         pluginInstance.startPlugin();
      } else {
         console.warn('[Message Cleaner] Plugin não possui método startPlugin()');
      }
      
      window.messageCleanerInstance = pluginInstance;
      
      console.log('✅ [Message Cleaner] Plugin carregado com sucesso!');
      console.log('📝 [Message Cleaner] Para descarregar, execute: window.messageCleanerInstance.pluginWillUnload()');
      console.log('🔧 [Message Cleaner] Para verificar status, execute: window.messageCleanerInstance');
      
      if (window.equicord?.api?.notices?.sendToast) {
         window.equicord.api.notices.sendToast('message-cleaner-loaded', {
            header: 'Message Cleaner',
            content: 'Plugin carregado com sucesso!',
            type: 'success',
            timeout: 3000
         });
      }
      
   } catch (error) {
      console.error('❌ [Message Cleaner] Erro ao carregar plugin:', error);
      console.error('📋 [Message Cleaner] Detalhes:', {
         message: error.message,
         stack: error.stack,
         name: error.name
      });
      
      if (window.equicord?.api?.notices?.sendToast) {
         window.equicord.api.notices.sendToast('message-cleaner-error', {
            header: 'Message Cleaner - Erro',
            content: `Erro ao carregar: ${error.message}`,
            type: 'danger',
            timeout: 5000
         });
      }
   }
})();


