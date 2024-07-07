/**
 * Should be refactored. Absolutely unreadable and not optimal, but I am very lazy.
 * */
class SelectorManager {
    static getMinimalElementSelector(element) {
        let path = [];

        while (element.parentElement && !this.canBeUnique(element, document)) {
            path.unshift(element);
            element = element.parentElement;
        }
        let selector = this.getSelector(element);
        let firstNodeLength = (selector + ' > ').length;
        path.forEach((x) => {
            let pseudoClass = (this.canBeUnique(x, x.parentElement)) ? '' : this.getNthChildSelector(x);
            selector += ' > ' + this.getSelector(x, pseudoClass, ' > ' + selector);
        });

        //if first element is a first unique in document then second will be with :ntr-child
        // and we can skip first due to :ntr-child has index
        if (selector.length > firstNodeLength) {
            let withoutFirstNode = selector.substring(firstNodeLength);
            return document.querySelectorAll(withoutFirstNode).length === 1
                ? withoutFirstNode
                : selector;
        }
        return selector;
    }

    static getNthChildSelector(elem, optionalPath = '') {
        const parent = (elem.parentNode) ? elem.parentNode : document;
        const siblings = Array.from(parent.children);
        const index = siblings.indexOf(elem) + 1;
        return `:nth-child(${index})`;
    }

    static canBeUnique(elem, parent = document) {
        let selector = elem.tagName.toLowerCase();
        selector += (elem.id)? `#${elem.id}` : '';
        selector +=  (elem.className) ? '.' + elem.className.split(' ').join('.') : '';
        return parent.querySelectorAll(selector).length === 1;
    }

    static getSelector(elem, pseudo = '', path = '') {
        let selector = elem.tagName.toLowerCase();
        let parent = (elem.parentNode) ? elem.parentNode : document;
        console.log(`parent is document: ${parent === document}`);
        let findings = parent.querySelectorAll(`${selector}${pseudo}${path}`).length;
        if (findings.length === 1)
            return selector + pseudo;
        if (elem.id) {
            let findingsWithId = parent.querySelectorAll(`${selector}#${elem.id}${pseudo}${path}`).length;
            if (findings > findingsWithId) {
                selector += `#${elem.id}`;
                findings = findingsWithId;
            }
        } else {
            if (elem.classList.length > 0) {
                elem.classList.forEach((x) => {
                    let findingsWithClass = parent.querySelectorAll(`${selector}.${x}${pseudo}${path}`).length;
                    if (findings > findingsWithClass) {
                        findings = findingsWithClass;
                        selector += `.${x}`;
                    }
                });
            }
        }

        return selector + pseudo;
    }
}