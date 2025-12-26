/**
 * Script de Injeção v2 - Message Cleaner para Equicord
 * Versão melhorada com melhor tratamento de erros
 * 
 * Como usar:
 * 1. Publique o plugin no GitHub
 * 2. Obtenha a URL raw do arquivo index.jsx
 * 3. Abra o console do Discord (Ctrl+Shift+I)
 * 4. Cole e execute este script, substituindo a URL abaixo
 */

(async function() {
   // ⚠️ SUBSTITUA ESTA URL PELA URL RAW DO SEU PLUGIN NO GITHUB ⚠️
   const PLUGIN_URL = 'https://raw.githubusercontent.com/SEU-USUARIO/SEU-REPO/main/index.jsx';
   
   try {
      console.log('🚀 [Message Cleaner] Iniciando carregamento...');
      
      // Verifica se o Equicord está disponível
      if (!window.equicord) {
         throw new Error('❌ Equicord não está disponível. Certifique-se de que o Equicord está instalado e ativo.');
      }
      
      console.log('✅ [Message Cleaner] Equicord detectado');
      console.log('📥 [Message Cleaner] Carregando plugin de:', PLUGIN_URL);
      
      // Carrega o código do plugin
      const response = await fetch(PLUGIN_URL);
      if (!response.ok) {
         throw new Error(`❌ Erro HTTP ${response.status}: ${response.statusText}`);
      }
      
      let pluginCode = await response.text();
      
      // Verifica se recebeu conteúdo válido
      if (!pluginCode || pluginCode.trim().length === 0) {
         throw new Error('❌ O arquivo está vazio ou não pôde ser carregado');
      }
      
      // Verifica se recebeu HTML em vez de JavaScript (erro comum)
      if (pluginCode.trim().startsWith('<!DOCTYPE') || pluginCode.trim().startsWith('<html')) {
         throw new Error('❌ O servidor retornou HTML em vez de JavaScript. Verifique se a URL está correta e aponta para o arquivo raw.');
      }
      
      console.log(`✅ [Message Cleaner] Código carregado (${pluginCode.length} caracteres)`);
      
      // Remove BOM se presente
      if (pluginCode.charCodeAt(0) === 0xFEFF) {
         pluginCode = pluginCode.slice(1);
      }
      
      // Verifica se há JSX que precisa ser transpilado
      const hasJSX = /<[A-Z][a-zA-Z]*/.test(pluginCode);
      
      if (hasJSX) {
         console.log('⚙️ [Message Cleaner] JSX detectado, carregando Babel...');
         
         // Carrega Babel standalone se ainda não estiver carregado
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
         
         // Transpila o JSX
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
      
      // Cria contexto de módulo
      const moduleExports = {};
      const module = { exports: moduleExports };
      
      // Cria função require compatível com Equicord
      const require = (path) => {
         if (path.startsWith('equicord/')) {
            try {
               // Tenta diferentes métodos de acesso
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
      
      // Executa o código
      let PluginClass;
      try {
         // Cria uma função isolada para executar o código
         const executePlugin = function(require, module, exports, equicord) {
            // Executa o código do plugin
            eval(pluginCode);
            // Retorna o que foi exportado
            return module.exports || exports;
         };
         
         PluginClass = executePlugin(require, module, module.exports, window.equicord);
         
         // Se não obteve resultado, tenta do module.exports
         if (!PluginClass) {
            PluginClass = module.exports || moduleExports;
         }
      } catch (execError) {
         console.error('❌ [Message Cleaner] Erro ao executar código:');
         console.error('   Tipo:', execError.name);
         console.error('   Mensagem:', execError.message);
         
         // Tenta identificar a linha do erro
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
         
         // Mostra contexto do erro
         const errorIndex = execError.message.indexOf('Unexpected');
         if (errorIndex !== -1) {
            console.error('   Isso geralmente indica um erro de sintaxe ou código incompleto');
            console.error('   Verifique se o arquivo no GitHub está completo e correto');
         }
         
         throw execError;
      }
      
      // Valida a classe do plugin
      if (!PluginClass) {
         throw new Error('Plugin não exportou nada. Verifique se o arquivo tem "module.exports = class ..."');
      }
      
      if (typeof PluginClass !== 'function') {
         console.error('O que foi exportado:', PluginClass);
         throw new Error('Plugin não exportou uma classe. Exportou: ' + typeof PluginClass);
      }
      
      console.log('✅ [Message Cleaner] Classe do plugin carregada');
      console.log('🏗️ [Message Cleaner] Criando instância...');
      
      // Cria instância do plugin
      const pluginInstance = new PluginClass();
      pluginInstance.entityID = 'message-cleaner';
      
      // Sistema de configurações
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
      
      // Método de log
      pluginInstance.log = (...args) => {
         console.log('[Message Cleaner]', ...args);
      };
      
      console.log('🚀 [Message Cleaner] Iniciando plugin...');
      
      // Inicia o plugin
      if (typeof pluginInstance.startPlugin === 'function') {
         pluginInstance.startPlugin();
      } else {
         console.warn('⚠️ [Message Cleaner] Plugin não possui método startPlugin()');
      }
      
      // Armazena globalmente
      window.messageCleanerInstance = pluginInstance;
      
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('✅ [Message Cleaner] Plugin carregado com sucesso!');
      console.log('═══════════════════════════════════════════════════════');
      console.log('📝 Para descarregar: window.messageCleanerInstance.pluginWillUnload()');
      console.log('🔧 Para verificar: window.messageCleanerInstance');
      console.log('');
      
      // Notificação visual
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
      
      // Notificação de erro
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

