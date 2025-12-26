(async function() {
   // ⚠️ SUBSTITUA ESTA URL PELA URL RAW DO SEU PLUGIN NO GITHUB ⚠️
   const PLUGIN_URL = 'https://raw.githubusercontent.com/stilting/x/refs/heads/main/index.jsx';
   
   try {
      console.log('🚀 [Message Cleaner] Iniciando carregamento...');
      
      if (!window.equicord) {
         throw new Error('❌ Equicord não está disponível. Certifique-se de que o Equicord está instalado e ativo.');
      }
      
      console.log('✅ [Message Cleaner] Equicord detectado');
      console.log('📥 [Message Cleaner] Carregando plugin de:', PLUGIN_URL);
      
      const response = await fetch(PLUGIN_URL);
      if (!response.ok) {
         throw new Error(`❌ Erro HTTP ${response.status}: ${response.statusText}`);
      }
      
      let pluginCode = await response.text();
      
      if (!pluginCode || pluginCode.trim().length === 0) {
         throw new Error('❌ O arquivo está vazio ou não pôde ser carregado');
      }
      
      if (pluginCode.trim().startsWith('<!DOCTYPE') || pluginCode.trim().startsWith('<html')) {
         throw new Error('❌ O servidor retornou HTML em vez de JavaScript. Verifique se a URL está correta e aponta para o arquivo raw.');
      }
      
      console.log(`✅ [Message Cleaner] Código carregado (${pluginCode.length} caracteres)`);
      
      if (pluginCode.charCodeAt(0) === 0xFEFF) {
         pluginCode = pluginCode.slice(1);
      }
      
      const hasJSX = /<[A-Z][a-zA-Z]*/.test(pluginCode);
      
      if (hasJSX) {
         console.log('⚙️ [Message Cleaner] JSX detectado, carregando Babel...');
         
         if (!window.Babel) {
            console.log('📦 [Message Cleaner] Carregando Babel Standalone...');
            const babelScript = document.createElement('script');
            babelScript.src = 'https://unpkg.com/@babel/standalone/babel.min.js';
            await new Promise((resolve, reject) => {
               babelScript.onload = () => {
                  console.log('✅ [Message Cleaner] Babel carregado');
                  resolve();
               };
               babelScript.onerror = () => reject(new Error('❌ Falha ao carregar Babel'));
               document.head.appendChild(babelScript);
            });
         }
         
         try {
            pluginCode = Babel.transform(pluginCode, {
               presets: ['react', 'env']
            }).code;
            console.log('✅ [Message Cleaner] JSX transpilado');
         } catch (transpileError) {
            console.error('❌ [Message Cleaner] Erro ao transpilar:', transpileError);
            throw new Error('Erro ao transpilar JSX: ' + transpileError.message);
         }
      }
      
      console.log('🔧 [Message Cleaner] Preparando ambiente de execução...');
      
      const moduleExports = {};
      const module = { exports: moduleExports };
      
      const require = (path) => {
         if (path.startsWith('equicord/')) {
            try {
               if (window.equicord?.webpack?.require) {
                  const result = window.equicord.webpack.require(path);
                  if (result) return result;
               }
               if (window.equicord?.require) {
                  const result = window.equicord.require(path);
                  if (result) return result;
               }
               if (window.require) {
                  const result = window.require(path);
                  if (result) return result;
               }
            } catch (e) {
               console.warn(`⚠️ [Message Cleaner] Erro ao carregar ${path}:`, e.message);
            }
            console.warn(`⚠️ [Message Cleaner] Módulo ${path} não encontrado, retornando objeto vazio`);
            return {};
         }
         throw new Error(`Módulo não encontrado: ${path}`);
      };
      
      console.log('⚡ [Message Cleaner] Executando código do plugin...');
      
      let PluginClass;
      try {
         const executePlugin = function(require, module, exports, equicord) {
            eval(pluginCode);
            return module.exports || exports;
         };
         
         PluginClass = executePlugin(require, module, module.exports, window.equicord);
         
         if (!PluginClass) {
            PluginClass = module.exports || moduleExports;
         }
      } catch (execError) {
         console.error('❌ [Message Cleaner] Erro ao executar código:');
         console.error('   Tipo:', execError.name);
         console.error('   Mensagem:', execError.message);
         
         if (execError.stack) {
            const lineMatch = execError.stack.match(/:(\d+):(\d+)/);
            if (lineMatch) {
               const lineNum = parseInt(lineMatch[1]) - 1;
               const lines = pluginCode.split('\n');
               if (lines[lineNum]) {
                  console.error(`   Linha ${lineNum + 1}:`, lines[lineNum]);
               }
            }
         }
         
         const errorIndex = execError.message.indexOf('Unexpected');
         if (errorIndex !== -1) {
            console.error('   Isso geralmente indica um erro de sintaxe ou código incompleto');
            console.error('   Verifique se o arquivo no GitHub está completo e correto');
         }
         
         throw execError;
      }
      
      if (!PluginClass) {
         throw new Error('Plugin não exportou nada. Verifique se o arquivo tem "module.exports = class ..."');
      }
      
      if (typeof PluginClass !== 'function') {
         console.error('O que foi exportado:', PluginClass);
         throw new Error('Plugin não exportou uma classe. Exportou: ' + typeof PluginClass);
      }
      
      console.log('✅ [Message Cleaner] Classe do plugin carregada');
      console.log('🏗️ [Message Cleaner] Criando instância...');
      
      const pluginInstance = new PluginClass();
      pluginInstance.entityID = 'message-cleaner';
      
      pluginInstance.settings = {
         get: (key, defaultValue) => {
            try {
               const stored = localStorage.getItem(`equicord_message-cleaner_${key}`);
               return stored !== null ? JSON.parse(stored) : defaultValue;
            } catch (e) {
               return defaultValue;
            }
         },
         set: (key, value) => {
            try {
               localStorage.setItem(`equicord_message-cleaner_${key}`, JSON.stringify(value));
            } catch (e) {
               console.error(`Erro ao salvar configuração ${key}:`, e);
            }
         }
      };
      
      pluginInstance.log = (...args) => {
         console.log('[Message Cleaner]', ...args);
      };
      
      console.log('🚀 [Message Cleaner] Iniciando plugin...');
      
      if (typeof pluginInstance.startPlugin === 'function') {
         pluginInstance.startPlugin();
      } else {
         console.warn('⚠️ [Message Cleaner] Plugin não possui método startPlugin()');
      }
      
      window.messageCleanerInstance = pluginInstance;
      
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('✅ [Message Cleaner] Plugin carregado com sucesso!');
      console.log('═══════════════════════════════════════════════════════');
      console.log('📝 Para descarregar: window.messageCleanerInstance.pluginWillUnload()');
      console.log('🔧 Para verificar: window.messageCleanerInstance');
      console.log('');
      
      if (window.equicord?.api?.notices?.sendToast) {
         window.equicord.api.notices.sendToast('message-cleaner-loaded', {
            header: 'Message Cleaner',
            content: 'Plugin carregado com sucesso!',
            type: 'success',
            timeout: 3000
         });
      }
      
   } catch (error) {
      console.error('');
      console.error('═══════════════════════════════════════════════════════');
      console.error('❌ [Message Cleaner] ERRO AO CARREGAR PLUGIN');
      console.error('═══════════════════════════════════════════════════════');
      console.error('Tipo:', error.name);
      console.error('Mensagem:', error.message);
      console.error('Stack:', error.stack);
      console.error('');
      console.error('💡 Dicas para resolver:');
      console.error('   1. Verifique se a URL está correta');
      console.error('   2. Certifique-se de que o arquivo está público no GitHub');
      console.error('   3. Tente acessar a URL diretamente no navegador');
      console.error('   4. Verifique se o arquivo está completo');
      console.error('');
      
      if (window.equicord?.api?.notices?.sendToast) {
         window.equicord.api.notices.sendToast('message-cleaner-error', {
            header: 'Message Cleaner - Erro',
            content: error.message.substring(0, 100),
            type: 'danger',
            timeout: 5000
         });
      }
      
      throw error;
   }
})();


