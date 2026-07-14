/**
 * MÓDULO: safe-render.js
 * Centraliza la conversión segura de datos persistidos a HTML, atributos y URLs.
 * Conserva el formato básico generado por Quill sin permitir etiquetas, atributos
 * ni protocolos que puedan ejecutar código al mostrar datos importados o locales.
 */

(function initializeSafeRenderer() {
    const ALLOWED_TAGS = new Set([
        'a', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'h1', 'h2', 'h3',
        'h4', 'h5', 'h6', 'i', 'li', 'ol', 'p', 'pre', 's', 'span', 'strong',
        'u', 'ul'
    ]);
    const ALLOWED_STYLE_PROPERTIES = ['backgroundColor', 'color', 'fontStyle', 'fontWeight', 'textDecoration'];
    const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+/gi;
    const internalPlaceholderUrls = new Set();

    /** Convierte cualquier valor a texto seguro para interpolarlo en HTML. */
    function escapeText(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /** Escapa un valor que se insertará dentro de una cadena JavaScript de un handler existente. */
    function escapeInlineHandlerArgument(value) {
        const javascriptString = String(value ?? '')
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n');

        return escapeText(javascriptString);
    }

    /** Devuelve una URL navegable únicamente si usa HTTP(S). */
    function getSafeExternalUrl(value) {
        const candidate = String(value ?? '').trim();
        if (!candidate) return '';

        try {
            const parsed = new URL(candidate, window.location.href);
            return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
        } catch (error) {
            return '';
        }
    }

    /** Evita que datos importados usen esquemas peligrosos como javascript: en imágenes. */
    function getSafeImageUrl(value) {
        return getSafeExternalUrl(value);
    }

    /**
     * Emite un placeholder SVG creado por la aplicación y conserva su procedencia
     * para el lightbox. No convierte en válida ninguna URL data: recibida como dato.
     */
    function createInternalSvgPlaceholder(svgMarkup) {
        const placeholderUrl = `data:image/svg+xml,${encodeURIComponent(String(svgMarkup ?? ''))}`;
        internalPlaceholderUrls.add(placeholderUrl);
        return placeholderUrl;
    }

    /**
     * Permite en el lightbox solo HTTP(S) o un placeholder emitido por createInternalSvgPlaceholder.
     */
    function getSafeLightboxImageUrl(value) {
        const candidate = String(value ?? '');
        return internalPlaceholderUrls.has(candidate) ? candidate : getSafeImageUrl(candidate);
    }

    function appendSanitizedNode(sourceNode, targetDocument, targetContainer) {
        if (sourceNode.nodeType === Node.TEXT_NODE) {
            targetContainer.appendChild(targetDocument.createTextNode(sourceNode.textContent || ''));
            return;
        }

        if (sourceNode.nodeType !== Node.ELEMENT_NODE) return;

        const tagName = sourceNode.tagName.toLowerCase();
        if (!ALLOWED_TAGS.has(tagName)) {
            Array.from(sourceNode.childNodes).forEach(child => appendSanitizedNode(child, targetDocument, targetContainer));
            return;
        }

        const safeElement = targetDocument.createElement(tagName);

        if (tagName === 'a') {
            const safeHref = getSafeExternalUrl(sourceNode.getAttribute('href'));
            if (safeHref) {
                safeElement.href = safeHref;
                safeElement.target = '_blank';
                safeElement.rel = 'noopener noreferrer';
            }
        }

        if (tagName === 'span' || tagName === 'strong') {
            const styleProbe = targetDocument.createElement('span');
            const safeStyles = [];

            ALLOWED_STYLE_PROPERTIES.forEach(property => {
                const value = sourceNode.style[property];
                if (!value) return;

                styleProbe.style[property] = value;
                if (styleProbe.style[property]) {
                    const cssProperty = property.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
                    safeStyles.push(`${cssProperty}: ${styleProbe.style[property]}`);
                }
            });

            if (safeStyles.length > 0) {
                safeElement.setAttribute('style', safeStyles.join('; '));
            }
        }

        Array.from(sourceNode.childNodes).forEach(child => appendSanitizedNode(child, targetDocument, safeElement));
        targetContainer.appendChild(safeElement);
    }

    function linkifyTextNodes(container) {
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        let currentNode;

        while ((currentNode = walker.nextNode())) {
            if (!currentNode.parentElement?.closest('a, code, pre')) {
                textNodes.push(currentNode);
            }
        }

        textNodes.forEach(textNode => {
            const text = textNode.textContent || '';
            URL_PATTERN.lastIndex = 0;
            if (!URL_PATTERN.test(text)) return;

            URL_PATTERN.lastIndex = 0;
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match;

            while ((match = URL_PATTERN.exec(text))) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));

                const safeUrl = getSafeExternalUrl(match[0]);
                if (safeUrl) {
                    const link = document.createElement('a');
                    link.href = safeUrl;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.textContent = match[0];
                    fragment.appendChild(link);
                } else {
                    fragment.appendChild(document.createTextNode(match[0]));
                }

                lastIndex = match.index + match[0].length;
            }

            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
            textNode.replaceWith(fragment);
        });
    }

    /**
     * Conserva una lista mínima de etiquetas de formato y elimina atributos no permitidos.
     * @param {unknown} value Contenido potencialmente procedente de almacenamiento o importación.
     * @param {{ linkify?: boolean }} options Activa la conversión segura de URLs de texto a enlaces.
     * @returns {string} HTML seguro para asignar a innerHTML.
     */
    function sanitizeRichHtml(value, options = {}) {
        const template = document.createElement('template');
        template.innerHTML = String(value ?? '');

        const safeContainer = document.createElement('div');
        Array.from(template.content.childNodes).forEach(node => appendSanitizedNode(node, document, safeContainer));

        if (options.linkify) {
            linkifyTextNodes(safeContainer);
        }

        return safeContainer.innerHTML;
    }

    function textToHtml(value) {
        return escapeText(value).replace(/\r?\n/g, '<br>');
    }

    window.GymNotesSafe = Object.freeze({
        escapeInlineHandlerArgument,
        escapeText,
        createInternalSvgPlaceholder,
        getSafeExternalUrl,
        getSafeImageUrl,
        getSafeLightboxImageUrl,
        sanitizeRichHtml,
        textToHtml
    });
})();
