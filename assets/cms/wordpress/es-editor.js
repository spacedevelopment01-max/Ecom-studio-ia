/**
 * E-COM STUDIO IA — éditeur des sections dans WordPress (bloc « Section E-COM STUDIO »).
 * Les réglages de chaque section (textes, liens, images, disposition, couleurs, marges) et ses éléments (questions,
 * étapes, faits, prestations…) se modifient dans la barre latérale ; l'aperçu est le rendu réel du thème.
 * Les champs viennent du schéma de la section (le même que dans l'éditeur de thème Shopify). Sans étape de
 * compilation : uniquement les bibliothèques fournies par WordPress.
 */
(function (wp) {
	if (!wp || !wp.blocks) return;
	var h = wp.element.createElement;
	var Fragment = wp.element.Fragment;
	var be = wp.blockEditor;
	var c = wp.components;
	var SSR = wp.serverSideRender;
	var __ = wp.i18n.__;
	var schemas = window.esSchemas || {};

	function opt(list) {
		return (list || []).map(function (o) { return { value: o.value, label: o.label || o.value }; });
	}

	/** Un champ du schéma → un contrôle WordPress. Les types inconnus ne sont pas affichés (jamais perdus). */
	function field(def, value, onChange, key) {
		var label = def.label || def.id;
		var help = def.info || undefined;
		switch (def.type) {
			case 'header':
				return h('p', { key: key, style: { fontWeight: 600, margin: '16px 0 8px' } }, def.content);
			case 'paragraph':
				return h('p', { key: key, style: { opacity: 0.75 } }, def.content);
			case 'checkbox':
				return h(c.ToggleControl, { key: key, label: label, help: help, checked: !!value, onChange: onChange });
			case 'range':
			case 'number':
				return h(c.RangeControl, { key: key, label: label, help: help, value: Number(value) || 0, min: def.min != null ? def.min : 0, max: def.max != null ? def.max : 200, step: def.step || 1, onChange: onChange });
			case 'select':
			case 'radio':
				return h(c.SelectControl, { key: key, label: label, help: help, value: value, options: opt(def.options), onChange: onChange });
			case 'textarea':
			case 'richtext':
			case 'html':
				return h(c.TextareaControl, { key: key, label: label, help: help, value: value || '', onChange: onChange });
			case 'image_picker':
				return h(be.MediaUploadCheck, { key: key }, h(be.MediaUpload, {
					allowedTypes: ['image'],
					value: undefined,
					onSelect: function (m) { onChange(m && m.url ? m.url : ''); },
					render: function (o) {
						return h('div', { style: { marginBottom: '12px' } },
							h('p', { style: { margin: '0 0 6px' } }, label),
							value ? h('img', { src: value, alt: '', style: { maxWidth: '100%', display: 'block', marginBottom: '6px' } }) : null,
							h(c.Button, { variant: 'secondary', onClick: o.open }, value ? __('Remplacer l’image', 'es-theme') : __('Choisir une image', 'es-theme')),
							value ? h(c.Button, { variant: 'link', isDestructive: true, onClick: function () { onChange(''); } }, __('Retirer', 'es-theme')) : null);
					},
				}));
			case 'text':
			case 'inline_richtext':
			case 'url':
			case 'color_scheme':
			case 'link_list':
			default:
				if (def.type && ['text', 'inline_richtext', 'url', 'color_scheme', 'link_list', 'color'].indexOf(def.type) === -1) return null;
				return h(c.TextControl, { key: key, label: label, help: help, value: value == null ? '' : String(value), onChange: onChange });
		}
	}

	function settingsPanel(defs, values, set) {
		return (defs || []).map(function (d, i) {
			return field(d, d.id ? values[d.id] : undefined, function (v) { if (d.id) set(d.id, v); }, (d.id || 'h') + i);
		});
	}

	wp.blocks.registerBlockType('es/section', {
		apiVersion: 3,
		title: __('Section E-COM STUDIO', 'es-theme'),
		description: __('Section du site conçu dans E-COM STUDIO IA (même rendu que dans le studio).', 'es-theme'),
		category: 'design',
		icon: 'layout',
		attributes: {
			type: { type: 'string', default: 'v2-cta' },
			sectionId: { type: 'string', default: '' },
			onlyFor: { type: 'string', default: '' },
			settings: { type: 'object', default: {} },
			blocks: { type: 'array', default: [] },
		},
		supports: { html: false, customClassName: false },
		variations: Object.keys(schemas).map(function (t) {
			return { name: t, title: schemas[t].name || t, attributes: { type: t }, isActive: ['type'] };
		}),
		edit: function (props) {
			var a = props.attributes;
			var schema = schemas[a.type] || { settings: [], blocks: [] };
			var settings = a.settings || {};
			var blocks = a.blocks || [];
			var setSetting = function (k, v) { var n = Object.assign({}, settings); n[k] = v; props.setAttributes({ settings: n }); };
			var setBlocks = function (list) { props.setAttributes({ blocks: list }); };
			var blockPanels = blocks.map(function (b, i) {
				var def = (schema.blocks || []).filter(function (x) { return x.type === b.type; })[0] || { settings: [] };
				var title = (def.name || b.type) + ' ' + (i + 1);
				var setB = function (k, v) {
					var list = blocks.slice();
					var s = Object.assign({}, list[i].settings || {});
					s[k] = v;
					list[i] = Object.assign({}, list[i], { settings: s });
					setBlocks(list);
				};
				var move = function (d) { var list = blocks.slice(); var j = i + d; if (j < 0 || j >= list.length) return; var t = list[i]; list[i] = list[j]; list[j] = t; setBlocks(list); };
				return h(c.PanelBody, { key: 'b' + i, title: title, initialOpen: false },
					settingsPanel(def.settings, b.settings || {}, setB),
					h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
						h(c.Button, { variant: 'secondary', onClick: function () { move(-1); }, disabled: i === 0 }, __('Monter', 'es-theme')),
						h(c.Button, { variant: 'secondary', onClick: function () { move(1); }, disabled: i === blocks.length - 1 }, __('Descendre', 'es-theme')),
						h(c.Button, { variant: 'secondary', isDestructive: true, onClick: function () { setBlocks(blocks.filter(function (_, j) { return j !== i; })); } }, __('Supprimer', 'es-theme'))));
			});
			var adders = (schema.blocks || []).map(function (def) {
				return h(c.Button, { key: 'add-' + def.type, variant: 'secondary', onClick: function () { setBlocks(blocks.concat([{ type: def.type, settings: {} }])); } }, __('Ajouter :', 'es-theme') + ' ' + (def.name || def.type));
			});
			return h(Fragment, null,
				h(be.InspectorControls, null,
					h(c.PanelBody, { title: schema.name || a.type, initialOpen: true }, settingsPanel(schema.settings, settings, setSetting)),
					blockPanels,
					adders.length ? h(c.PanelBody, { title: __('Ajouter un élément', 'es-theme'), initialOpen: false }, h('div', { style: { display: 'grid', gap: '6px' } }, adders)) : null),
				h('div', be.useBlockProps({}), h(SSR, { block: 'es/section', attributes: a })));
		},
		save: function () { return null; },
	});
})(window.wp);
