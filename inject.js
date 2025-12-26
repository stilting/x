/**
 * Script de Injeção - Message Cleaner para Equicord
 * 
 * Como usar:
 * 1. Publique o plugin no GitHub
 * 2. Obtenha a URL raw do arquivo index.jsx (ex: https://raw.githubusercontent.com/seu-usuario/seu-repo/main/index.jsx)
 * 3. Abra o console do Discord (Ctrl+Shift+I)
 * 4. Cole e execute este script, substituindo a URL abaixo pela URL do seu plugin
 * 
 * IMPORTANTE: Substitua a URL abaixo pela URL raw do seu plugin no GitHub!
 */

(async function() {
   // ⚠️ SUBSTITUA ESTA URL PELA URL RAW DO SEU PLUGIN NO GITHUB ⚠️
   const PLUGIN_URL = 'https://raw.githubusercontent.com/SEU-USUARIO/SEU-REPO/main/index.jsx';
   
   try {
      console.log('[Message Cleaner] Iniciando carregamento...');
      
      // Verifica se o Equicord está disponível
      if (!window.equicord) {
         throw new Error('Equicord não está disponível. Certifique-se de que o Equicord está instalado e ativo.');
      }
      
      console.log('[Message Cleaner] Equicord detectado, carregando plugin...');
      
      // Carrega o código do plugin
      const response = await fetch(PLUGIN_URL);
      if (!response.ok) {
         throw new Error(`Erro ao carregar plugin: ${response.status} ${response.statusText}`);
      }
      
      const pluginCode = await response.text();
      console.log('[Message Cleaner] Código do plugin carregado, compilando...');
      
      // Cria um contexto de módulo para o plugin
      const moduleExports = {};
      const module = { exports: moduleExports };
      
      // Cria uma função require que funciona com o Equicord
      const require = (path) => {
         if (path.startsWith('equicord/')) {
            // Tenta diferentes métodos de acesso ao Equicord
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
      
      // Executa o código do plugin em um contexto isolado
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
      
      // Cria a instância do plugin
      const pluginInstance = new PluginClass();
      pluginInstance.entityID = 'message-cleaner';
      
      // Sistema de configurações usando localStorage
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
      
      // Método de log
      pluginInstance.log = (...args) => {
         console.log('[Message Cleaner]', ...args);
      };
      
      console.log('[Message Cleaner] Iniciando plugin...');
      
      // Inicia o plugin
      if (typeof pluginInstance.startPlugin === 'function') {
         pluginInstance.startPlugin();
      } else {
         console.warn('[Message Cleaner] Plugin não possui método startPlugin()');
      }
      
      // Armazena a instância globalmente para poder descarregar depois
      window.messageCleanerInstance = pluginInstance;
      
      console.log('✅ [Message Cleaner] Plugin carregado com sucesso!');
      console.log('📝 [Message Cleaner] Para descarregar, execute: window.messageCleanerInstance.pluginWillUnload()');
      console.log('🔧 [Message Cleaner] Para verificar status, execute: window.messageCleanerInstance');
      
      // Mostra notificação de sucesso se possível
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
      
      // Mostra notificação de erro se possível
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

