// ==========================================================================
// vide controls
// TODO: This needs to be split into smaller files and cleaned up
// ==========================================================================
import RangeTouch from 'rangetouch';

import captions from './captions';
import html5 from './html5';
import support from './support';
import { repaint, transitionEndEvent } from './utils/animation';
import { dedupe } from './utils/arrays';
import browser from './utils/browser';
import {
    createElement,
    emptyElement,
    getAttributesFromSelector,
    getElement,
    getElements,
    hasClass,
    matches,
    removeElement,
    setAttributes,
    setFocus,
    toggleClass,
    toggleHidden,
} from './utils/elements';
import { off, on, triggerEvent } from './utils/events';
import i18n from './utils/i18n';
import is from './utils/is';
import loadSprite from './utils/load-sprite';
import { extend } from './utils/objects';
import { getPercentage, replaceAll, toCamelCase, toTitleCase } from './utils/strings';
import { formatTime, getHours } from './utils/time';

// TODO: Don't export a massive object - break down and create class
const controls = {
    // Get icon URL
    getIconUrl() {
        const url = new URL(this.config.iconUrl, window.location);
        const host = window.location.host ? window.location.host : window.top.location.host;
        const cors = url.host !== host || (browser.isIE && !window.svg4everybody);

        return {
            url: this.config.iconUrl,
            cors,
        };
    },

    // Find the UI controls
    findElements() {
        try {
            this.elements.controls = getElement.call(this, this.config.selectors.controls.wrapper);

            // Buttons
            this.elements.buttons = {
                play: getElements.call(this, this.config.selectors.buttons.play),
                pause: getElement.call(this, this.config.selectors.buttons.pause),
                restart: getElement.call(this, this.config.selectors.buttons.restart),
                rewind: getElement.call(this, this.config.selectors.buttons.rewind),
                fastForward: getElement.call(this, this.config.selectors.buttons.fastForward),
                mute: getElement.call(this, this.config.selectors.buttons.mute),
                pip: getElement.call(this, this.config.selectors.buttons.pip),
                airplay: getElement.call(this, this.config.selectors.buttons.airplay),
                settings: getElement.call(this, this.config.selectors.buttons.settings),
                speedMenu: getElement.call(this, this.config.selectors.buttons.speedMenu),
                captionsMenu: getElement.call(this, this.config.selectors.buttons.captionsMenu),
                qualityMenu: getElement.call(this, this.config.selectors.buttons.qualityMenu),
                audioTracksMenu: getElement.call(this, this.config.selectors.buttons.audioTracksMenu),
                captions: getElement.call(this, this.config.selectors.buttons.captions),
                fullscreen: getElement.call(this, this.config.selectors.buttons.fullscreen),
            };

            // Progress
            this.elements.progress = getElement.call(this, this.config.selectors.progress);

            // Inputs
            this.elements.inputs = {
                seek: getElement.call(this, this.config.selectors.inputs.seek),
                volume: getElement.call(this, this.config.selectors.inputs.volume),
            };

            // Display
            this.elements.display = {
                buffer: getElement.call(this, this.config.selectors.display.buffer),
                currentTime: getElement.call(this, this.config.selectors.display.currentTime),
                duration: getElement.call(this, this.config.selectors.display.duration),
            };

            // Seek tooltip
            if (is.element(this.elements.progress)) {
                this.elements.display.seekTooltip = this.elements.progress.querySelector(`.${this.config.classNames.tooltip}`);
            }

            return true;
        } catch (error) {
            // Log it
            this.debug.warn('It looks like there is a problem with your custom controls HTML', error);

            // Restore native video controls
            this.toggleNativeControls(true);

            return false;
        }
    },

    // Create <svg> icon
    createIcon(type, attributes) {
        const namespace = 'http://www.w3.org/2000/svg';
        const iconUrl = controls.getIconUrl.call(this);
        const iconPath = `${!iconUrl.cors ? iconUrl.url : ''}#${this.config.iconPrefix}`;
        // Create <svg>
        const icon = document.createElementNS(namespace, 'svg');
        setAttributes(
            icon,
            extend(attributes, {
                'aria-hidden': 'true',
                focusable: 'false',
                viewBox: '0 0 70 38'
            }),
        );

        // Create the <use> to reference sprite
        const use = document.createElementNS(namespace, 'use');
        const path = `${iconPath}-${type}`;

        // Set `href` attributes
        // https://github.com/sampotts/vide/issues/460
        // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/xlink:href
        if ('href' in use) {
            use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', path);
        }

        // Always set the older attribute even though it's "deprecated" (it'll be around for ages)
        use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', path);

        // Add <use> to <svg>
        icon.appendChild(use);

        return icon;
    },

    // Create hidden text label
    createLabel(key, attr = {}) {
        const text = i18n.get(key, this.config);
        const attributes = { ...attr, class: [attr.class, this.config.classNames.hidden].filter(Boolean).join(' ') };

        return createElement('span', attributes, text);
    },

    // Create a badge
    createBadge(text) {
        if (is.empty(text)) {
            return null;
        }

        const badge = createElement('span', {
            class: this.config.classNames.menu.value,
        });

        badge.appendChild(
            createElement(
                'span',
                {
                    class: this.config.classNames.menu.badge,
                },
                text,
            ),
        );

        return badge;
    },

    // Create a <button>
    createButton(buttonType, attr) {
        const attributes = extend({}, attr);
        let type = toCamelCase(buttonType);

        const props = {
            element: 'button',
            toggle: false,
            label: null,
            icon: null,
            labelPressed: null,
            iconPressed: null,
            qualityIcons: false,
            qualityOptions: [4320, 2880, 2160, 1440, 1080, 720, 576, 480, 360, 240]
        };

        ['element', 'icon', 'label'].forEach((key) => {
            if (Object.keys(attributes).includes(key)) {
                props[key] = attributes[key];
                delete attributes[key];
            }
        });

        // Default to 'button' type to prevent form submission
        if (props.element === 'button' && !Object.keys(attributes).includes('type')) {
            attributes.type = 'button';
        }

        // Set class name
        if (Object.keys(attributes).includes('class')) {
            if (!attributes.class.split(' ').some((c) => c === this.config.classNames.control)) {
                extend(attributes, {
                    class: `${attributes.class} ${this.config.classNames.control}`,
                });
            }
        } else {
            attributes.class = this.config.classNames.control;
        }

        const volumeValue = this.storage.get('volumeValue') || '0'

        // Large play button
        switch (buttonType) {
            case 'play':
                props.toggle = true;
                props.label = 'play';
                props.labelPressed = 'pause';
                props.icon = 'play';
                props.iconPressed = 'pause';
                break;

            case 'cast':
                props.toggle = true;
                props.label = 'cast';
                props.labelPressed = 'cast-connected';
                props.icon = 'cast';
                props.iconPressed = 'cast-connected';
                break;

            case 'mute':
                props.toggle = true;
                props.label = 'mute';
                props.labelPressed = 'unmute';
                props.icon = `volume-${volumeValue}`;
                props.iconPressed = 'muted';
                break;

            case 'captions':
                props.toggle = true;
                props.label = 'enableCaptions';
                props.labelPressed = 'disableCaptions';
                props.icon = 'captions-off';
                props.iconPressed = 'captions-on';
                break;

            case 'fullscreen':
                props.toggle = true;
                props.label = 'enterFullscreen';
                props.labelPressed = 'exitFullscreen';
                props.icon = 'enter-fullscreen';
                props.iconPressed = 'exit-fullscreen';
                break;

            case 'skipButton':
                props.icon = null
                props.label = null
                break

            case 'play-large':
                props.toggle = true
                attributes.class += ` ${this.config.classNames.control}--overlaid`;
                type = 'play';
                props.label = 'play';
                props.labelPressed = 'pause';
                props.icon = 'play';
                props.iconPressed = 'pause';
                break;

            default:
                if (is.empty(props.label)) {
                    props.label = type;
                }
                if (is.empty(props.icon)) {
                    props.icon = buttonType;
                }
        }

        const button = createElement(props.element);

        // Setup toggle icon and labels
        if (props.toggle) {
            // Icon
            if (!is.empty(props.iconPressed))
                button.appendChild(
                    controls.createIcon.call(this, props.iconPressed, {
                        class: 'icon--pressed',
                    }),
                );

            if (!is.empty(props.icon))
                button.appendChild(
                    controls.createIcon.call(this, props.icon, {
                        class: 'icon--not-pressed',
                    }),
                );

            // Label/Tooltip
            button.appendChild(
                controls.createLabel.call(this, props.labelPressed, {
                    class: 'label--pressed',
                }),
            );
            button.appendChild(
                controls.createLabel.call(this, props.label, {
                    class: 'label--not-pressed',
                }),
            );
        } else {
            if (!is.empty(props.icon))
                button.appendChild(controls.createIcon.call(this, props.icon));

            if (!is.empty(props.label))
                button.appendChild(controls.createLabel.call(this, props.label));
        }

        // Merge and set attributes
        extend(attributes, getAttributesFromSelector(this.config.selectors.buttons[type], attributes));
        setAttributes(button, attributes);

        // We have multiple play buttons
        if (type === 'play') {
            if (!is.array(this.elements.buttons[type])) {
                this.elements.buttons[type] = [];
            }

            this.elements.buttons[type].push(button);
        } else {
            this.elements.buttons[type] = button;
        }

        return button;
    },

    // Create an <input type='range'>
    createRange(type, attributes) {
        // Seek input
        const input = createElement(
            'input',
            extend(
                getAttributesFromSelector(this.config.selectors.inputs[type]),
                {
                    type: 'range',
                    min: 0,
                    max: 100,
                    step: 0.01,
                    value: 0,
                    autocomplete: 'off',
                    // A11y fixes for https://github.com/sampotts/vide/issues/905
                    role: 'slider',
                    'aria-label': i18n.get(type, this.config),
                    'aria-valuemin': 0,
                    'aria-valuemax': 100,
                    'aria-valuenow': 0,
                },
                attributes,
            ),
        );

        this.elements.inputs[type] = input;

        // Set the fill for webkit now
        controls.updateRangeFill.call(this, input);

        // Improve support on touch devices
        RangeTouch.setup(input);

        return input;
    },

    // Create a <progress>
    createProgress(type, attributes) {
        const progress = createElement(
            'progress',
            extend(
                getAttributesFromSelector(this.config.selectors.display[type]),
                {
                    min: 0,
                    max: 100,
                    value: 0,
                    role: 'progressbar',
                    'aria-hidden': true,
                },
                attributes,
            ),
        );

        // Create the label inside
        if (type !== 'volume') {
            progress.appendChild(createElement('span', null, '0'));

            const suffixKey = {
                played: 'played',
                buffer: 'buffered',
            }[type];
            const suffix = suffixKey ? i18n.get(suffixKey, this.config) : '';

            progress.innerText = `% ${suffix.toLowerCase()}`;
        }

        this.elements.display[type] = progress;

        return progress;
    },

    // Create time display
    createTime(type, attrs) {
        const attributes = getAttributesFromSelector(this.config.selectors.display[type], attrs);

        const container = createElement(
            'div',
            extend(attributes, {
                class: `${attributes.class ? attributes.class : ''} ${this.config.classNames.display.time} `.trim(),
                'aria-label': i18n.get(type, this.config),
            }),
            '00:00',
        );

        // Reference for updates
        this.elements.display[type] = container;

        return container;
    },

    // Bind keyboard shortcuts for a menu item
    // We have to bind to keyup otherwise Firefox triggers a click when a keydown event handler shifts focus
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1220143
    bindMenuItemShortcuts(menuItem, type) {
        // Navigate through menus via arrow keys and space
        on.call(
            this,
            menuItem,
            'keydown keyup',
            (event) => {
                // We only care about space and ⬆️ ⬇️️ ➡️
                if (!['Space', 'ArrowUp', 'ArrowDown', 'ArrowRight'].includes(event.key)) {
                    return;
                }

                // Prevent play / seek
                event.preventDefault();
                event.stopPropagation();

                // We're just here to prevent the keydown bubbling
                if (event.type === 'keydown') {
                    return;
                }

                const isRadioButton = matches(menuItem, '[role="menuitemradio"]');

                // Show the respective menu
                if (!isRadioButton && ['Space', 'ArrowRight'].includes(event.key)) {
                    controls.showMenuPanel.call(this, type, true);
                } else {
                    let target;

                    if (event.key !== 'Space') {
                        if (event.key === 'ArrowDown' || (isRadioButton && event.key === 'ArrowRight')) {
                            target = menuItem.nextElementSibling;

                            if (!is.element(target)) {
                                target = menuItem.parentNode.firstElementChild;
                            }
                        } else {
                            target = menuItem.previousElementSibling;

                            if (!is.element(target)) {
                                target = menuItem.parentNode.lastElementChild;
                            }
                        }

                        setFocus.call(this, target, true);
                    }
                }
            },
            false,
        );

        // Enter will fire a `click` event but we still need to manage focus
        // So we bind to keyup which fires after and set focus here
        on.call(this, menuItem, 'keyup', (event) => {
            if (event.key !== 'Return') return;

            controls.focusFirstMenuItem.call(this, null, true);
        });
    },

    // Create a settings menu item
    createMenuItem({ value, list, type, title, badge = null, checked = false, key = 'settings' }) {
        const attributes = getAttributesFromSelector(this.config.selectors.inputs[type]);

        const menuItem = createElement(
            'button',
            extend(attributes, {
                type: 'button',
                role: 'menuitemradio',
                class: `${this.config.classNames.control} ${attributes.class ? attributes.class : ''}`.trim(),
                'aria-checked': checked,
                value,
            }),
        );

        const flex = createElement('span');

        // We have to set as HTML incase of special characters
        flex.innerHTML = title;

        if (is.element(badge)) {
            flex.appendChild(badge);
        }

        menuItem.appendChild(flex);

        // Replicate radio button behavior
        Object.defineProperty(menuItem, 'checked', {
            enumerable: true,
            get() {
                return menuItem.getAttribute('aria-checked') === 'true';
            },
            set(check) {
                // Ensure exclusivity
                if (check) {
                    Array.from(menuItem.parentNode.children)
                        .filter((node) => matches(node, '[role="menuitemradio"]'))
                        .forEach((node) => node.setAttribute('aria-checked', 'false'));
                }

                menuItem.setAttribute('aria-checked', check ? 'true' : 'false');
            },
        });

        this.listeners.bind(
            menuItem,
            'click keyup',
            (event) => {
                if (is.keyboardEvent(event) && event.key !== 'Space') {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();

                menuItem.checked = true

                switch (type) {
                    case 'language':
                        this.currentTrack = Number(value);
                        break;

                    case 'quality':
                        this.quality = value;
                        break;

                    case 'speed':
                        this.speed = parseFloat(value);
                        break;

                    case 'audioTracks':
                        this.config.audioTracks.onChange(Number(value))
                        break
                    default:
                        break;
                }

                //controls.toggleMenu.call(this, false, key)
            },
            type,
            false,
        );

        controls.bindMenuItemShortcuts.call(this, menuItem, type);

        list.appendChild(menuItem);
    },

    // Format a time for display
    formatTime(time = 0, inverted = false) {
        // Bail if the value isn't a number
        if (!is.number(time)) {
            return time;
        }

        // Always display hours if duration is over an hour
        const forceHours = getHours(this.duration) > 0;

        return formatTime(time, forceHours, inverted);
    },

    // Update the displayed time
    updateTimeDisplay(target = null, time = 0, inverted = false) {
        // Bail if there's no element to display or the value isn't a number
        if (!is.element(target) || !is.number(time)) {
            return;
        }

        // eslint-disable-next-line no-param-reassign
        target.innerText = controls.formatTime(time, inverted);
    },

    // Update volume UI and storage
    updateVolume() {
        if (!this.supported.ui) {
            return;
        }

        // Update range
        if (is.element(this.elements.inputs.volume)) {
            controls.setRange.call(this, this.elements.inputs.volume, this.muted ? 0 : this.volume);
        }

        // Update mute state
        if (is.element(this.elements.buttons.mute)) {
            this.elements.buttons.mute.pressed = this.muted || this.volume === 0;
        }

        const volumeValue = Number(this.volume) * 100
        let value = 0

        if (volumeValue > 0 && volumeValue <= 10)
            value = 10

        if (volumeValue > 10 && volumeValue <= 30)
            value = 30

        if (volumeValue > 30 && volumeValue <= 60)
            value = 30

        if (volumeValue > 60 && volumeValue < 80)
            value = 60

        if (volumeValue >= 80)
            value = 80

        // Save to storage
        this.storage.set({
            volumeValue: value.toFixed(0)
        })

        if (this.muted)
            return

        const button = this.elements.buttons.mute
        button.innerHTML = ''
        button.appendChild(
            controls.createIcon.call(this, `volume-${value}`, {
                class: 'icon--not-pressed',
            })
        )
        button.appendChild(
            controls.createIcon.call(this, `muted`, {
                class: 'icon--pressed',
            })
        )
    },

    closeWatched(time = 0, target) {
        this.currentTime = time
        this.media.currentTime = time

        this.play()

        if (time > 0)
            this.forward(time)

        Array.from(this.elements.buttons.play || []).forEach((button) => {
            button.hidden = false
        })

        this.elements.container.classList.remove('hasWatchHistory')
        target.remove()
    },

    // Show watched box
    showWatchedInput(event) {
        const player = event.detail.vide

        // Check if feature is enabled
        if (!player?.config?.continueWatching?.enabled)
            return

        const watchedBefore = Number(localStorage?.getItem(`watched_${player.config?.code}`) || 0)

        if (watchedBefore > 0) {
            // Add class to player
            player.elements.container.classList.add('hasWatchHistory')

            const duration = player?.config?.length || 0
            const invert = !is.element(player.elements.display.duration) && player.config.invertTime;

            controls.updateTimeDisplay.call(
                player,
                player.elements.display.currentTime,
                invert ? duration - watchedBefore : watchedBefore,
                invert,
            )

            if (player.elements.display.duration)
                controls.updateTimeDisplay.call(player, player.elements.display.duration, duration);

            const value = getPercentage(watchedBefore, duration);

            // Set seek range value only if it's a 'natural' time event
            controls.setRange.call(player, player.elements.inputs.seek, value)

            player.currentTime = watchedBefore
            player.media.currentTime = watchedBefore

            if (player.config.controls.includes('watchedBefore')) {
                const watchedBeforeElement = createElement('div', {
                    class: 'watchedBefore'
                })

                const timeElement = controls.createTime.call(player, 'watchedBefore')
                const time = controls.formatTime(watchedBefore, false)

                const title = player?.config?.continueWatching?.title || 'Resume playing?'
                const description = player?.config?.continueWatching?.description || 'You left at [time], please click the "continue watching" button below to start where you left.'

                timeElement.innerHTML = `<h4>${title}</h4><p>${description.replace('[time]', '<strong>'+time+'</strong>')}</p>`

                watchedBeforeElement.appendChild(timeElement)
                const buttons = createElement('div', {
                    class: 'actions'
                })

                const accept = controls.createButton.call(player, '', {
                    class: 'accept',
                    icon: null
                })

                const playWrapper = createElement('span', { class: 'playIcon' })
                const playIcon = controls.createIcon.call(player, 'play-alt')
                playWrapper.appendChild(playIcon)
                accept.appendChild(playWrapper)

                accept.innerHTML += '<span>Continue watching</span>'
                const chevrons = controls.createIcon.call(player, 'chevrons', {
                    class: 'chevrons',
                })
                accept.appendChild(chevrons)

                // progress button
                if (value > 28) {
                    const progressSpan = createElement('span', { class: 'progress' })
                    progressSpan.style.width = `${value}%`
                    accept.appendChild(progressSpan)
                }

                const decline = controls.createButton.call(player, 'close', {
                    class: 'decline'
                })
                decline.innerHTML += '<span>Close</span>'

                const keyShortcuts = (event) => {
                    if (event.isComposing || event.keyCode === 229)
                        return

                    event.stopPropagation()
                    event.preventDefault()

                    if (['Space', 'Enter'].includes(event.code) || [32, 13].includes(event.keyCode) ) {
                        controls.closeWatched.call(player, watchedBefore, watchedBeforeElement)
                        off.call(player, document, 'keydown', keyShortcuts, false)
                    }

                    if (event.code === 'Escape' || event.keyCode === 27) {
                        controls.closeWatched.call(player, 0, watchedBeforeElement)
                        off.call(player, document, 'keydown', keyShortcuts, false)
                    }
                }

                on.call(player, document, 'keydown', keyShortcuts, false)

                on.call(player, accept, 'click', (event) => {
                    event.stopPropagation()
                    event.preventDefault()

                    controls.closeWatched.call(player, watchedBefore, watchedBeforeElement)
                    player.elements.container.classList.remove('hasWatchHistory')

                    off.call(player, document, 'keydown', keyShortcuts, false)
                }, false)

                on.call(player, decline, 'click', (event) => {
                    event.stopPropagation()
                    event.preventDefault()

                    controls.closeWatched.call(player, 0, watchedBeforeElement)
                    player.elements.container.classList.remove('hasWatchHistory')

                    off.call(player, document, 'keydown', keyShortcuts, false)
                }, false)

                buttons.appendChild(accept)
                watchedBeforeElement.appendChild(decline)
                watchedBeforeElement.appendChild(buttons)

                player.elements.watchedBefore = watchedBeforeElement
                player.elements.container.appendChild(watchedBeforeElement)
            }
        }
    },

    // Update seek value and lower fill
    setRange(target, value = 0) {
        if (!is.element(target)) {
            return;
        }

        // eslint-disable-next-line
        target.value = value;

        // Webkit range fill
        controls.updateRangeFill.call(this, target);
    },

    // Update <progress> elements
    updateProgress(event) {
        if (!this.supported.ui || !is.event(event)) {
            return;
        }

        let value = 0;

        const setProgress = (target, input) => {
            const val = is.number(input) ? input : 0;
            const progress = is.element(target) ? target : this.elements.display.buffer;

            // Update value and label
            if (is.element(progress)) {
                progress.value = val;

                // Update text label inside
                const label = progress.getElementsByTagName('span')[0];
                if (is.element(label)) {
                    label.childNodes[0].nodeValue = val;
                }
            }
        };

        if (event) {
            switch (event.type) {
                // Video playing
                case 'timeupdate':
                case 'seeking':
                case 'seeked':
                    value = getPercentage(this.currentTime, this.duration);

                    // Set seek range value only if it's a 'natural' time event
                    if (event.type === 'timeupdate') {
                        controls.setRange.call(this, this.elements.inputs.seek, value);
                    }

                    // update progress bar
                    const bar =  this.elements.progress.querySelector('.vide__progress')
                    bar.style.width = `${value}%`

                    break;

                // Check buffer status
                case 'playing':
                case 'progress':
                    setProgress(this.elements.display.buffer, this.buffered * 100);

                    break;

                default:
                    break;
            }
        }
    },

    // Webkit polyfill for lower fill range
    updateRangeFill(target) {
        // Get range from event if event passed
        const range = is.event(target) ? target.target : target;

        // Needs to be a valid <input type='range'>
        if (!is.element(range) || range.getAttribute('type') !== 'range') {
            return;
        }

        // Set aria values for https://github.com/sampotts/vide/issues/905
        if (matches(range, this.config.selectors.inputs.seek)) {
            range.setAttribute('aria-valuenow', this.currentTime);
            const currentTime = controls.formatTime(this.currentTime);
            const duration = controls.formatTime(this.duration);
            const format = i18n.get('seekLabel', this.config);
            range.setAttribute(
                'aria-valuetext',
                format.replace('{currentTime}', currentTime).replace('{duration}', duration),
            );
        } else if (matches(range, this.config.selectors.inputs.volume)) {
            const percent = range.value * 100;
            range.setAttribute('aria-valuenow', percent);
            range.setAttribute('aria-valuetext', `${percent.toFixed(1)}%`);
        } else {
            range.setAttribute('aria-valuenow', range.value);
        }

        // WebKit only
        if (!browser.isWebkit) {
            return;
        }

        // Set CSS custom property
        range.style.setProperty('--value', `${(range.value / range.max) * 100}%`);
    },

    // Update hover tooltip for seeking
    updateSeekTooltip(event) {
        // Bail if setting not true
        if (
            !this.config.tooltips.seek ||
            !is.element(this.elements.inputs.seek) ||
            !is.element(this.elements.display.seekTooltip) ||
            this.duration === 0
        ) {
            return;
        }

        const tipElement = this.elements.display.seekTooltip;
        const visible = `${this.config.classNames.tooltip}--visible`;
        const toggle = (show) => toggleClass(tipElement, visible, show);

        // Hide on touch
        if (this.touch) {
            toggle(false);
            return;
        }

        // Determine percentage, if already visible
        let percent = 0;
        const clientRect = this.elements.progress.getBoundingClientRect();

        if (is.event(event)) {
            percent = (100 / clientRect.width) * (event.pageX - clientRect.left);
        } else if (hasClass(tipElement, visible)) {
            percent = parseFloat(tipElement.style.left, 10);
        } else {
            return;
        }

        // Set bounds
        if (percent < 0) {
            percent = 0;
        } else if (percent > 100) {
            percent = 100;
        }

        const time = (this.duration / 100) * percent;

        // Display the time a click would seek to
        tipElement.innerText = controls.formatTime(time);

        // Get marker point for time
        const point = this.config.markers?.points?.find(({ time: t }) => t === Math.round(time));

        // Append the point label to the tooltip
        if (point) {
            tipElement.insertAdjacentHTML('afterbegin', `${point.label}<br>`);
        }

        // Set position
        tipElement.style.left = `${percent}%`;

        // Show/hide the tooltip
        // If the event is a moues in/out and percentage is inside bounds
        if (is.event(event) && ['mouseenter', 'mouseleave'].includes(event.type)) {
            toggle(event.type === 'mouseenter');
        }
    },

    // Handle time change event
    timeUpdate(event) {
        // Only invert if only one time element is displayed and used for both duration and currentTime
        const invert = this.config.invertTime;

        // Duration
        controls.updateTimeDisplay.call(
            this,
            this.elements.display.currentTime,
            invert ? this.duration - this.currentTime : this.currentTime,
            invert,
        );

        // Ignore updates while seeking
        if (event && event.type === 'timeupdate' && this.media.seeking) {
            return;
        }

        // Save current time on local storage
        if (this.currentTime > 0)
            localStorage?.setItem(`watched_${this.config.code}`, this.currentTime.toString())

        // Playing progress
        controls.updateProgress.call(this, event);
    },

    // Show the duration on metadataloaded or durationchange events
    durationUpdate() {
        // Bail if no UI or durationchange event triggered after playing/seek when invertTime is false
        if (!this.supported.ui || (!this.config.invertTime && this.currentTime)) {
            return;
        }

        // If duration is the 2**32 (shaka), Infinity (HLS), DASH-IF (Number.MAX_SAFE_INTEGER || Number.MAX_VALUE) indicating live we hide the currentTime and progressbar.
        // https://github.com/video-dev/hls.js/blob/5820d29d3c4c8a46e8b75f1e3afa3e68c1a9a2db/src/controller/buffer-controller.js#L415
        // https://github.com/google/shaka-player/blob/4d889054631f4e1cf0fbd80ddd2b71887c02e232/lib/media/streaming_engine.js#L1062
        // https://github.com/Dash-Industry-Forum/dash.js/blob/69859f51b969645b234666800d4cb596d89c602d/src/dash/models/DashManifestModel.js#L338
        if (this.duration >= 2 ** 32) {
            toggleHidden(this.elements.display.currentTime, true);
            toggleHidden(this.elements.progress, true);
            return;
        }

        // Update ARIA values
        if (is.element(this.elements.inputs.seek)) {
            this.elements.inputs.seek.setAttribute('aria-valuemax', this.duration);
        }

        // If there's a spot to display duration
        const hasDuration = is.element(this.elements.display.duration);

        // If there's only one time display, display duration there
        if (!hasDuration && this.config.displayDuration && this.paused) {
            controls.updateTimeDisplay.call(this, this.elements.display.currentTime, this.duration);
        }

        // If there's a duration element, update content
        if (hasDuration) {
            controls.updateTimeDisplay.call(this, this.elements.display.duration, this.duration);
        }

        if (this.config.markers.enabled) {
            controls.setMarkers.call(this);
        }

        // Update the tooltip (if visible)
        controls.updateSeekTooltip.call(this);
    },

    // Hide/show a tab
    toggleMenuButton(setting, toggle, key = 'settings') {
        toggleHidden(this.elements[key].buttons[setting], !toggle);
    },

    // Update the selected setting
    updateSetting(setting, container, input, key = 'settings') {
        const pane = this.elements[key].panels[setting];
        let value = null;
        let list = container;

        if (setting === 'captions') {
            value = this.currentTrack;
        } else {
            value = !is.empty(input) ? input : this[setting];

            // Get default
            if (is.empty(value)) {
                value = this.config[setting].default;
            }

            // Unsupported value
            if (!is.empty(this.options[setting]) && !this.options[setting].includes(value)) {
                this.debug.warn(`Unsupported value of '${value}' for ${setting}`);
                return;
            }

            // Disabled value
            if (!this.config[setting].options.includes(value)) {
                this.debug.warn(`Disabled value of '${value}' for ${setting}`);
                return;
            }
        }

        // Get the list if we need to
        if (!is.element(list)) {
            list = pane && pane.querySelector('[role="menu"]');
        }

        // If there's no list it means it's not been rendered...
        if (!is.element(list)) {
            return;
        }

        // Update the label
        const label = this.elements[key].buttons[setting].querySelector(`.${this.config.classNames.menu.value}`)

        if (label)
            label.innerHTML = controls.getLabel.call(this, setting, value);

        // Add the quality icon
        if (setting === 'quality') {
            const button = this.elements.buttons.qualityMenu
            let newLabel = button.querySelector(`.${this.config.classNames.menu.value}`)

            if (newLabel) {
                newLabel.remove()
            }

            newLabel = createElement('span', {
                class: this.config.classNames.menu.value
            })
            newLabel.innerText = value + 'p'

            button.appendChild(newLabel)
        }

        // Find the radio option and check it
        const target = list && list.querySelector(`[value="${value}"]`);

        if (is.element(target)) {
            target.checked = true;
        }
    },

    // Translate a value into a nice label
    getLabel(setting, value) {
        switch (setting) {
            case 'speed':
                return value === 1 ? i18n.get('normal', this.config) : `${value}&times;`;

            case 'quality':
                if (is.number(value)) {
                    const label = i18n.get(`qualityLabel.${value}`, this.config);

                    if (!label.length) {
                        return `${value}p`;
                    }

                    return label;
                }

                return toTitleCase(value);

            case 'captions':
                return captions.getLabel.call(this);

            default:
                return null;
        }
    },

    // Set the quality menu
    setAudioTracksMenu(options) {
        // Menu required
        if (!is.element(this.elements.audioTracksMenu.panels.audioTracks))
            return

        const type = 'audioTracks';
        const list = this.elements.audioTracksMenu.panels.audioTracks.querySelector('[role="menu"]');

        this.options.audioTracks = this.config.audioTracks.options

        // Toggle the pane and tab
        const toggle = !is.empty(this.options.audioTracks) && this.options.audioTracks.length > 0;
        controls.toggleMenuButton.call(this, type, toggle, 'audioTracksMenu');

        // Empty the menu
        emptyElement(list);

        // Check if we need to toggle the parent
        controls.checkMenu.call(this, 'audioTracksMenu');

        // If we're hiding, nothing more to do
        if (!toggle)
            return

        // Create items
        this.options.audioTracks.forEach((audio) => {
            controls.createMenuItem.call(this, {
                value: audio.id,
                list,
                type,
                title: audio.name,
                checked:  audio.id === this.config.audioTracks.default,
                key: 'audioTracksMenu'
            });
        });

        controls.updateSetting.call(this, type, list, undefined, 'audioTracksMenu');
    },

    // Set the quality menu
    setQualityMenu(options) {
        // Menu required
        if (!is.element(this.elements.qualityMenu.panels.quality)) {
            return;
        }

        const type = 'quality';
        const list = this.elements.qualityMenu.panels.quality.querySelector('[role="menu"]');

        // Set options if passed and filter based on uniqueness and config
        if (is.array(options)) {
            this.options.quality = dedupe(options).filter((quality) => this.config.quality.options.includes(quality));
        }

        // Toggle the pane and tab
        const toggle = !is.empty(this.options.quality) && this.options.quality.length > 1;
        controls.toggleMenuButton.call(this, type, toggle, 'qualityMenu');

        // Empty the menu
        emptyElement(list);

        // Check if we need to toggle the parent
        controls.checkMenu.call(this, 'qualityMenu');

        // If we're hiding, nothing more to do
        if (!toggle) {
            return;
        }

        // Get the badge HTML for HD, 4K etc
        const getBadge = (quality) => {
            const label = i18n.get(`qualityBadge.${quality}`, this.config);

            if (!label.length) {
                return null;
            }

            return controls.createBadge.call(this, label);
        };

        // Sort options by the config and then render options
        this.options.quality
            .sort((a, b) => {
                const sorting = this.config.quality.options;
                return sorting.indexOf(a) > sorting.indexOf(b) ? 1 : -1;
            })
            .forEach((quality) => {
                controls.createMenuItem.call(this, {
                    value: quality,
                    list,
                    type,
                    title: controls.getLabel.call(this, 'quality', quality),
                    badge: getBadge(quality),
                    key: 'qualityMenu'
                });
            });

        controls.updateSetting.call(this, type, list, undefined, 'qualityMenu');
    },

    // Set a list of available captions languages
    setCaptionsMenu() {
        // Menu required
        if (!is.element(this.elements.captionsMenu.panels.captions))
            return

        const types = this.config.captionsMenu

        types.forEach(type => {
            const container = this.elements?.captionsMenu?.panels[type]

            if (!container)
                return

            const list = container.querySelector('[role="menu"]')
            const panel = this.elements.captionsMenu.panels[type]

            if (type === 'captions') {
                const tracks = captions.getTracks.call(this);
                const toggle = Boolean(tracks.length);

                // Toggle the pane and tab
                //controls.toggleMenuButton.call(this, type, toggle, 'captionsMenu');

                // Empty the menu
                emptyElement(list)

                // Check if we need to toggle the parent
                controls.checkMenu.call(this, 'captionsMenu');

                // If there's no captions, bail
                // if (!toggle) {
                //     panel.innerHTML = ''
                //     return
                // }

                // Generate options data
                const options = tracks.map((track, value) => ({
                    value,
                    checked: this.captions.toggled && this.currentTrack === value,
                    title: captions.getLabel.call(this, track),
                    badge: track.language && controls.createBadge.call(this, track.language.toUpperCase()),
                    list,
                    type: 'language',
                }));

                // Add the "Disabled" option to turn off captions
                options.unshift({
                    value: -1,
                    checked: !this.captions.toggled,
                    title: i18n.get('disabled', this.config),
                    list,
                    type: 'language',
                });

                // Generate options
                options.forEach((option) => {
                    controls.createMenuItem.call(this, {
                        value: option.value,
                        list: option.list,
                        type: option.type,
                        title: option.title,
                        badge: option.badge,
                        key: 'captionsMenu'
                    })
                });
            } else {
                this.options.audioTracks = this.config.audioTracks.options

                // Toggle the pane and tab
                const toggle = !is.empty(this.options.audioTracks) && this.options.audioTracks.length > 0;
                controls.toggleMenuButton.call(this, type, toggle, 'captionsMenu');

                // Empty the menu
                emptyElement(list);

                // Check if we need to toggle the parent
                controls.checkMenu.call(this, 'captionsMenu');

                // If we're hiding, nothing more to do
                if (!toggle) {
                    panel.innerHTML = ''
                    return
                }

                if (this.options.audioTracks.length < 1) {
                    panel.innerHTML = ''
                    return
                }

                // Create items
                this.options.audioTracks.forEach((audio) => {
                    controls.createMenuItem.call(this, {
                        value: audio.id,
                        list,
                        type,
                        title: audio.name,
                        checked:  audio.id === this.config.audioTracks.default,
                        key: 'captionsMenu'
                    });
                });
            }

            controls.updateSetting.call(this, type, list, undefined, 'captionsMenu');
        })
    },

    // Set a list of available captions languages
    setSpeedMenu() {
        // Menu required
        if (!is.element(this.elements.speedMenu.panels.speed)) {
            return;
        }

        const type = 'speed';
        const list = this.elements.speedMenu.panels.speed.querySelector('[role="menu"]');

        // Filter out invalid speeds
        this.options.speed = this.options.speed.filter((o) => o >= this.minimumSpeed && o <= this.maximumSpeed);

        // Toggle the pane and tab
        const toggle = !is.empty(this.options.speed) && this.options.speed.length > 1;
        controls.toggleMenuButton.call(this, type, toggle, 'speedMenu');

        // Empty the menu
        emptyElement(list);

        // Check if we need to toggle the parent
        controls.checkMenu.call(this, 'speedMenu');

        // If we're hiding, nothing more to do
        if (!toggle) {
            return;
        }

        const localSpeed = this.storage.get('speed')
        const currentSpeed = this.options.speed.includes(localSpeed) ? this.options.speed : this.config.speed.selected

        // Create items
        this.options.speed.forEach((speed) => {
            controls.createMenuItem.call(this, {
                value: speed,
                list,
                type,
                checked: speed === currentSpeed,
                title: controls.getLabel.call(this, 'speed', speed),
                key: 'speedMenu'
            });
        });

       // controls.updateSetting.call(this, type, list, undefined, 'speedMenu');

        this.speed = parseFloat(currentSpeed)
    },

    // Check if we need to hide/show the settings menu
    checkMenu(key = 'settings') {
        const { buttons } = this.elements[key];
        const visible = !is.empty(buttons) && Object.values(buttons).some((button) => !button.hidden);

        toggleHidden(this.elements[key].menu, !visible, key);
    },

    // Focus the first menu item in a given (or visible) menu
    focusFirstMenuItem(pane, tabFocus = false, key = 'settings') {
        if (this.elements[key].popup.hidden) {
            return;
        }

        let target = pane;

        if (!is.element(target)) {
            target = Object.values(this.elements[key].panels).find((p) => !p.hidden);
        }

        const firstItem = target.querySelector('[role^="menuitem"]');

        setFocus.call(this, firstItem, tabFocus);
    },

    // Show/hide menu
    toggleMenu(input, key = 'settings') {
        const { popup, menu } = this.elements[key];
        const button = this.elements.buttons[key];

        // Menu and button are required
        if (!is.element(popup) || !is.element(button)) {
            return;
        }

        // True toggle by default
        const { hidden } = popup;
        let show = hidden;

        if (is.boolean(input)) {
            show = input;
        } else if (is.keyboardEvent(input) && input.key === 'Escape') {
            show = false;
        } else if (is.event(input)) {
            // If vide is in a shadowDOM, the event target is set to the component, instead of the
            // Element in the shadowDOM. The path, if available, is complete.
            const target = is.function(input.composedPath) ? input.composedPath()[0] : input.target;
            const isMenuItem = popup.contains(target);

            // If the click was inside the menu or if the click
            // wasn't the button or menu item and we're trying to
            // show the menu (a doc click shouldn't show the menu)
            if (isMenuItem || (!isMenuItem && input.target !== button && show)) {
                return;
            }
        }

        // Set button attributes
        button.setAttribute('aria-expanded', show);

        // Show the actual popup
        toggleHidden(popup, !show)

        // Add class hook
        toggleClass(this.elements.container, this.config.classNames.menu.open, show);

        // Focus the first item if key interaction
        if (show && is.keyboardEvent(input)) {
            controls.focusFirstMenuItem.call(this, null, true, key);
        } else if (!show && !hidden) {
            // If closing, re-focus the button
            setFocus.call(this, button, is.keyboardEvent(input));
        }
    },

    // Get the natural size of a menu panel
    getMenuSize(tab) {
        const clone = tab.cloneNode(true);
        clone.style.position = 'absolute';
        clone.style.opacity = 0;
        clone.removeAttribute('hidden');

        // Append to parent so we get the "real" size
        tab.parentNode.appendChild(clone);

        // Get the sizes before we remove
        const width = clone.scrollWidth;
        const height = clone.scrollHeight;

        // Remove from the DOM
        removeElement(clone);

        return {
            width,
            height,
        };
    },

    // Show a panel in the menu
    showMenuPanel(type = '', tabFocus = false, key = 'settings') {
        const target = this.elements.container.querySelector(`#vide-${type}-${this.id}`);

        // Nothing to show, bail
        if (!is.element(target)) {
            return;
        }

        // Hide all other panels
        const container = target.parentNode;
        const current = Array.from(container.children).find((node) => !node.hidden);

        // If we can do fancy animations, we'll animate the height/width
        if (support.transitions && !support.reducedMotion) {
            // Set the current width as a base
            container.style.width = `${current.scrollWidth}px`;
            container.style.height = `${current.scrollHeight}px`;

            // Get potential sizes
            const size = controls.getMenuSize.call(this, target);

            // Restore auto height/width
            const restore = (event) => {
                // We're only bothered about height and width on the container
                if (event.target !== container || !['width', 'height'].includes(event.propertyName)) {
                    return;
                }

                // Revert back to auto
                container.style.width = '';
                container.style.height = '';

                // Only listen once
                off.call(this, container, transitionEndEvent, restore);
            };

            // Listen for the transition finishing and restore auto height/width
            on.call(this, container, transitionEndEvent, restore);

            // Set dimensions to target
            container.style.width = `${size.width}px`;
            container.style.height = `${size.height}px`;
        }

        // Set attributes on current tab
        toggleHidden(current, true);

        // Set attributes on target
        toggleHidden(target, false);

        // Focus the first item
        controls.focusFirstMenuItem.call(this, target, tabFocus, type);
    },

    // Set the download URL
    setDownloadUrl() {
        const button = this.elements.buttons.download;

        // Bail if no button
        if (!is.element(button)) {
            return;
        }

        // Set attribute
        button.setAttribute('href', this.download);
    },

    // Create settings options
    createSettingsOptions(menu) {

        // Subtitles size seeker
        const subtitleSizeWrapper = createElement('div', {
            class: 'subtitleSizeWrapper'
        })
        const label = createElement('span', {
            class: 'subtitleSizeWrapper__label label'
        })
        label.innerText = 'Subtitle size'

        const progress = createElement('div', {
            class: 'vide--range subtitleSizeWrapper__range'
        })

        // Seek range slider
        const captionsSize = this.storage.get('captionsSize') || 15
        const range = controls.createRange.call(this, 'size', {
            min: 0,
            max: 50,
            step: 1,
            value: captionsSize,
            id: `vide-seek-size`
        })

        if (captionsSize !== 15) {
            this.elements?.captions?.style.setProperty('--captions-font-size', captionsSize + 'px')
        } else {
            this.elements?.captions?.style.removeProperty('--captions-font-size')
        }

        const rangeSize = createElement('span', {
            class: 'subtitleSizeWrapper__range__title'
        })
        rangeSize.innerText = captionsSize

        // IE doesn't support input event, so we fallback to change
        const inputEvent = browser.isIE ? 'change' : 'input'

        on.call(this, range, inputEvent, (event) => {
            event.stopPropagation()
            event.preventDefault()

            const value = event.target.value
            this.storage.set({
                captionsSize: value
            })

            rangeSize.innerText = value

            if (value !== 15) {
                this.elements?.captions?.style.setProperty('--captions-font-size', value + 'px')
            } else {
                this.elements?.captions?.style.removeProperty('--captions-font-size')
            }

            triggerEvent.call(this, this.media, 'fontchange', false, {
                font: value
            })
        }, false)

        progress.appendChild(range)
        progress.appendChild(rangeSize)

        subtitleSizeWrapper.appendChild(label)
        subtitleSizeWrapper.appendChild(progress)

        menu.appendChild(subtitleSizeWrapper)

        // Subtitles background switch
        const backgroundSwitch = createElement('div', {
            class: 'backgroundSwitch'
        })
        const bsLabel = createElement('span', {
            class: 'backgroundSwitch__label label'
        })
        bsLabel.innerText = 'Subtitle background'

        const backgroundSwitchInput = controls.createSwitch.call(this, this.storage.get('showCaptionsBG') ? {
            checked: true
        } : {})

        if (this.storage.get('showCaptionsBG')) {
            this.elements?.captions?.classList.remove('vide__captions--noBackground')
        } else {
            this.elements?.captions?.classList.add('vide__captions--noBackground')
        }

        on.call(this, backgroundSwitchInput, 'change', (event) => {
            event.stopPropagation()
            event.preventDefault()

            this.storage.set({
                showCaptionsBG: event.target.checked
            })

            if (event.target.checked) {
                this.elements?.captions?.classList.remove('vide__captions--noBackground')
            } else {
                this.elements?.captions?.classList.add('vide__captions--noBackground')
            }
        }, false)

        backgroundSwitch.appendChild(bsLabel)
        backgroundSwitch.appendChild(backgroundSwitchInput)
        menu.appendChild(backgroundSwitch)

        // Mini seeker switch
        const miniSeekerSwitch = createElement('div', {
            class: 'miniSeekerSwitch'
        })
        const msLabel = createElement('span', {
            class: 'miniSeekerSwitch__label label'
        })
        msLabel.innerText = 'Show mini seeker'

        const miniSeekerSwitchInput = controls.createSwitch.call(this, this.storage.get('showMiniSeeker') ? {
            checked: true
        } : {})

        if (this.storage.get('showMiniSeeker')) {
            this.elements.bottomControls.classList.add('vide__controls__bottom--hasMiniSeeker')
        } else {
            this.elements.bottomControls.classList.remove('vide__controls__bottom--hasMiniSeeker')
        }

        on.call(this, miniSeekerSwitchInput, 'change', (event) => {
            event.stopPropagation()
            event.preventDefault()

            this.storage.set({
                showMiniSeeker: event.target.checked
            })

            if (event.target.checked) {
                this.elements.bottomControls.classList.add('vide__controls__bottom--hasMiniSeeker')
            } else {
                this.elements.bottomControls.classList.remove('vide__controls__bottom--hasMiniSeeker')
            }
        }, false)

        miniSeekerSwitch.appendChild(msLabel)
        miniSeekerSwitch.appendChild(miniSeekerSwitchInput)
        menu.appendChild(miniSeekerSwitch)
    },

    // Create switch toggle
    createSwitch(attr = {}) {
        const switchWrap = createElement('label', {
            class: 'switchWrap'
        })

        switchWrap.appendChild(createElement('input', {
           type: 'checkbox',
            ...attr
        }))
        switchWrap.appendChild(createElement('span'))

        return switchWrap
    },

    // Build the default HTML
    create(data) {
        const {
            bindMenuItemShortcuts,
            createButton,
            createProgress,
            createRange,
            createTime,
            setQualityMenu,
            setAudioTracksMenu,
            setSpeedMenu,
            showMenuPanel,
        } = controls;
        this.elements.controls = null;

        // Create center container
        const centerContainer = createElement('div', {
            class: 'vide__controls vide__controls__center'
        });

        // Add seek buttons
        this.elements.container.appendChild(createButton.call(this, 'forward-large', {
            class: 'vide__seekButton vide__seekButton--right',
            icon: 'chevrons'
        }))
        this.elements.container.appendChild(createButton.call(this, 'backward-large', {
            class: 'vide__seekButton vide__seekButton--left',
            icon: 'chevrons-left'
        }))

        // Create bottom container
        const bottomContainer = createElement('div', {
            class: 'vide__controls vide__controls__bottom'
        })
        this.elements.bottomControls = bottomContainer

        // Create time container
        const timeContainer = createElement('div', {
            class: 'time__controls'
        });

        // Create bottom controls
        const bottomControls = createElement('div', {
            class: 'controlsContent'
        })

        // Create top container
        const topContainer = createElement('div', {
            class: 'vide__controls vide__controls__top'
        })
        this.elements.topControls = topContainer

        // Create the container
        const container = createElement('div', getAttributesFromSelector(this.config.selectors.controls.wrapper));
        this.elements.controls = container;

        // Default item attributes
        const defaultAttributes = { class: 'vide__controls__item' };

        // Loop through controls in order
        dedupe(is.array(this.config.controls) ? this.config.controls : []).forEach((control) => {
            // Restart button
            if (control === 'restart') {
                bottomControls.appendChild(createButton.call(this, 'restart', defaultAttributes));
            }

            // Rewind button
            if (control === 'rewind') {
                const button = createButton.call(this, 'rewind', {
                    class: 'vide__control vide__control--overlaid vide__control--seek vide__control--rewind'
                })

                on.call(this, button, 'click', () => {
                    this.lastSeekTime = Date.now()
                    this.rewind()
                })

                centerContainer.appendChild(button);
                bottomControls.appendChild(createButton.call(this, 'rewind', defaultAttributes));
            }

            // Larger overlaid play button
            if (control === 'play-large') {
                const watchedBefore = Number(localStorage?.getItem(`watched_${this.config?.code}`) || 0)

                centerContainer.appendChild(createButton.call(this, 'play-large'));
            }

            // Play/Pause button
            if (control === 'play') {
                bottomControls.appendChild(createButton.call(this, 'play', defaultAttributes));
            }

            // Fast-forward button
            if (control === 'fast-forward') {
                const button = createButton.call(this, 'fast-forward', {
                    class: 'vide__control vide__control--overlaid vide__control--seek vide__control--forward'
                })

                on.call(this, button, 'click', () => {
                    this.lastSeekTime = Date.now()
                    this.forward()
                })

                centerContainer.appendChild(button);
                bottomControls.appendChild(createButton.call(this, 'fast-forward', defaultAttributes));
            }

            // Progress
            if (control === 'progress') {
                const progressContainer = createElement('div', {
                    class: `${defaultAttributes.class} vide__progress__container`,
                });

                const progress = createElement('div', getAttributesFromSelector(this.config.selectors.progress));

                // Seek range slider
                progress.appendChild(
                    createRange.call(this, 'seek', {
                        id: `vide-seek-${data.id}`,
                    }),
                );

                // Create progress bar
                progress.appendChild(createElement('span', {
                    class: 'vide__progress'
                }));

                // Create progress bar when seeking
                progress.appendChild(createElement('span', {
                    class: 'vide__progress--seek'
                }));

                // Buffer progress
                progress.appendChild(createProgress.call(this, 'buffer'));

                // TODO: Add loop display indicator

                // Seek tooltip
                if (this.config.tooltips.seek) {
                    const tooltip = createElement(
                        'span',
                        {
                            class: this.config.classNames.tooltip,
                        },
                        '00:00',
                    );

                    progress.appendChild(tooltip);
                    this.elements.display.seekTooltip = tooltip;
                }

                this.elements.progress = progress;
                this.elements.progressContainer = progressContainer;
                progressContainer.appendChild(this.elements.progress);
                bottomContainer.appendChild(progressContainer);
            }

            // Media current time display
            if (control === 'current-time') {
                timeContainer.appendChild(createTime.call(this, 'currentTime', defaultAttributes));
                bottomContainer.appendChild(timeContainer)
            }

            // Media duration display
            if (control === 'duration') {
                timeContainer.appendChild(createTime.call(this, 'duration', defaultAttributes));
                bottomContainer.appendChild(timeContainer)
            }

            // Volume controls
            if (control === 'mute' || control === 'volume') {
                let { volume } = this.elements;

                // Create the volume container if needed
                if (!is.element(volume) || !bottomControls.contains(volume)) {
                    volume = createElement(
                        'div',
                        extend({}, defaultAttributes, {
                            class: `${defaultAttributes.class} vide__volume`.trim(),
                        }),
                    );

                    this.elements.volume = volume;

                    bottomControls.appendChild(volume);
                }

                // Toggle mute button
                if (control === 'mute') {
                    volume.appendChild(createButton.call(this, 'mute'));
                }

                // Volume range control
                // Ignored on iOS as it's handled globally
                // https://developer.apple.com/library/safari/documentation/AudioVideo/Conceptual/Using_HTML5_Audio_Video/Device-SpecificConsiderations/Device-SpecificConsiderations.html
                if (control === 'volume' && !browser.isIos) {
                    // Set the attributes
                    const attributes = {
                        max: 1,
                        step: 0.05,
                        value: this.config.volume,
                    };

                    // Create the volume range slider
                    volume.appendChild(
                        createRange.call(
                            this,
                            'volume',
                            extend(attributes, {
                                id: `vide-volume-${data.id}`,
                            }),
                        ),
                    );
                }
            }

            // Toggle captions button
            // if (control === 'captions') {
            //     container.appendChild(createButton.call(this, 'captions', defaultAttributes));
            // }
            // Captions button
            if (control === 'captionsMenu' && !is.empty(this.config.captionsMenu)) {
                const wrapper = createElement(
                    'div',
                    extend({}, defaultAttributes, {
                        class: `${defaultAttributes.class} vide__menu`.trim(),
                        hidden: '',
                    }),
                );

                wrapper.appendChild(
                    createButton.call(this, 'captions-menu', {
                        'aria-haspopup': true,
                        'aria-controls': `vide-captionsMenu-${data.id}`,
                        'aria-expanded': false,
                    }),
                );

                const popup = createElement('div', {
                    class: 'vide__menu__container vide__menu__container--captionsMenu',
                    id: `vide-captionsMenu-${data.id}`,
                    hidden: '',
                });

                const inner = createElement('div');

                // Create the menu
                const menu = createElement('div', {
                    role: 'menu',
                });

                const labels = {
                    captions: 'Subtitles',
                    audioTracks: 'Audio'
                }

                // Build the menu items
                this.config.captionsMenu.forEach((type) => {
                    // Check if audioTracks and no tracaks present
                    if (type === 'audioTracks' && this.config.audioTracks.options.length < 1)
                        return

                    // TODO: bundle this with the createMenuItem helper and bindings
                    const menuItem = createElement(
                        'button',
                        extend(getAttributesFromSelector(this.config.selectors.buttons.captionsMenu), {
                            type: 'button',
                            class: `${this.config.classNames.control} ${this.config.classNames.control}--forward`,
                            role: 'menuitem',
                            'aria-haspopup': true
                        }),
                    );

                    // Bind menu shortcuts for keyboard users
                    bindMenuItemShortcuts.call(this, menuItem, type);

                    const flex = createElement('span', null, i18n.get(type, this.config));

                    const value = createElement('span', {
                        class: this.config.classNames.menu.value,
                    });

                    // Speed contains HTML entities
                    value.innerHTML = data[type];

                    flex.appendChild(value);
                    menuItem.appendChild(flex);
                    menu.appendChild(menuItem);

                    // Build the panes
                    const pane = createElement('div', {
                        id: `vide-captionsMenu-${data.id}-${type}`,
                        class: 'menuInnerContent'
                    });

                    // Create title
                    const title = createElement('span', {
                        class: 'title',
                    })
                    title.innerText = labels[type]
                    pane.appendChild(title)

                    // Go back via keyboard
                    on.call(
                        this,
                        pane,
                        'keydown',
                        (event) => {
                            if (event.key !== 'ArrowLeft') return;

                            // Prevent seek
                            event.preventDefault();
                            event.stopPropagation();

                            // hide menu
                            controls.toggleMenu.call(this, false, 'captionsMenu');
                        },
                        false,
                    );

                    // Menu
                    pane.appendChild(
                        createElement('div', {
                            role: 'menu',
                        }),
                    );

                    // Add upload subtitles
                    if (this.config.captions.upload && type === 'captions') {

                        // upload wrapper
                        const upload = createElement('div', {
                            class: 'captionUpload'
                        })

                        // Add upload input
                        const input = createElement('input', {
                            type: 'file',
                            class: 'captionUpload__input',
                            id: 'captionUpload'
                        })
                        upload.appendChild(input)

                        // Upload label
                        const label = createElement('label', {
                            class: 'captionUpload__label',
                            for: 'captionUpload'
                        })
                        const icon = controls.createIcon.call(this, 'import')
                        label.appendChild(icon)

                        label.innerHTML += 'Upload subtitle'
                        upload.appendChild(label)

                        pane.appendChild(upload)

                        // Watch upload change
                        on.call(
                            this,
                            input,
                            'change',
                            (event) => {
                                event.preventDefault();
                                event.stopPropagation();

                                // current tracks
                                const tracks = captions.getTracks.call(this)

                                const file = event.target.files[0]
                                const index = tracks.length + 1

                                const container = this.elements?.captionsMenu?.panels[type]

                                if (!container)
                                    return

                                const list = container.querySelector('[role="menu"]')

                                // Empty the menu
                                emptyElement(list)

                                // Check if we need to toggle the parent
                                controls.checkMenu.call(this, 'captionsMenu')

                                const reader = new FileReader()
                                reader.onload = () => {
                                    const caption = createElement('track', {
                                        kind: 'captions',
                                        label: file.name,
                                        srclang: 'local',
                                        src: reader.result
                                    })

                                    this.media.appendChild(caption)

                                    controls.createMenuItem.call(this, {
                                        value: index,
                                        list,
                                        type: 'language',
                                        title: file.name,
                                        checked: true,
                                        badge: 'local',
                                        key: 'captionsMenu'
                                    })

                                    this.currentTrack = index
                                }
                                reader.readAsDataURL(file)

                                // clear input file at the end
                                event.target.value = ''
                            },
                            false,
                        );
                    }

                    inner.appendChild(pane);

                    this.elements.captionsMenu.buttons[type] = menuItem;
                    this.elements.captionsMenu.panels[type] = pane;
                });

                popup.appendChild(inner);
                wrapper.appendChild(popup);
                bottomControls.appendChild(wrapper);

                this.elements.captionsMenu.popup = popup;
                this.elements.captionsMenu.menu = wrapper;
            }

            // Brand button
            if (control === 'brand') {
                bottomControls.appendChild(createButton.call(this, 'brand', extend({}, defaultAttributes, {
                    class: `${defaultAttributes.class} vide__brand`.trim(),
                })));
            }

            // Speed button
            // if (control === 'speedMenu' && !is.empty(this.config.speedMenu)) {
            //     const wrapper = createElement(
            //         'div',
            //         extend({}, defaultAttributes, {
            //             class: `${defaultAttributes.class} vide__menu`.trim(),
            //             hidden: '',
            //         }),
            //     );
            //
            //     wrapper.appendChild(
            //         createButton.call(this, 'speed-menu', {
            //             'aria-haspopup': true,
            //             'aria-controls': `vide-speedMenu-${data.id}`,
            //             'aria-expanded': false,
            //         }),
            //     );
            //
            //     const popup = createElement('div', {
            //         class: 'vide__menu__container vide__menu__container--speedMenu',
            //         id: `vide-speedMenu-${data.id}`,
            //         hidden: '',
            //     });
            //
            //     const inner = createElement('div');
            //
            //     // Create the menu
            //     const menu = createElement('div', {
            //         role: 'menu',
            //     });
            //
            //     // Build the menu items
            //     this.config.speedMenu.forEach((type) => {
            //         // TODO: bundle this with the createMenuItem helper and bindings
            //         const menuItem = createElement(
            //             'button',
            //             extend(getAttributesFromSelector(this.config.selectors.buttons.speedMenu), {
            //                 type: 'button',
            //                 class: `${this.config.classNames.control} ${this.config.classNames.control}--forward`,
            //                 role: 'menuitem',
            //                 'aria-haspopup': true
            //             }),
            //         );
            //
            //         // Bind menu shortcuts for keyboard users
            //         bindMenuItemShortcuts.call(this, menuItem, type);
            //
            //         const flex = createElement('span', null, i18n.get(type, this.config));
            //
            //         const value = createElement('span', {
            //             class: this.config.classNames.menu.value,
            //         });
            //
            //         // Speed contains HTML entities
            //         value.innerHTML = data[type];
            //
            //         flex.appendChild(value);
            //         menuItem.appendChild(flex);
            //         menu.appendChild(menuItem);
            //
            //         // Build the panes
            //         const pane = createElement('div', {
            //             id: `vide-speedMenu-${data.id}-${type}`
            //         });
            //
            //         // Create title
            //         const title = createElement('span', {
            //             class: 'title',
            //         })
            //         title.innerText = 'Playback speed'
            //         pane.appendChild(title)
            //
            //         // Go back via keyboard
            //         on.call(
            //             this,
            //             pane,
            //             'keydown',
            //             (event) => {
            //                 if (event.key !== 'ArrowLeft') return;
            //
            //                 // Prevent seek
            //                 event.preventDefault();
            //                 event.stopPropagation();
            //
            //                 // hide menu
            //                 controls.toggleMenu.call(this, false, 'speedMenu');
            //             },
            //             false,
            //         );
            //
            //         // Menu
            //         pane.appendChild(
            //             createElement('div', {
            //                 role: 'menu',
            //             }),
            //         );
            //
            //         inner.appendChild(pane);
            //
            //         this.elements.speedMenu.buttons[type] = menuItem;
            //         this.elements.speedMenu.panels[type] = pane;
            //     });
            //
            //     popup.appendChild(inner);
            //     wrapper.appendChild(popup);
            //     bottomControls.appendChild(wrapper);
            //
            //     this.elements.speedMenu.popup = popup;
            //     this.elements.speedMenu.menu = wrapper;
            // }

            // Quality button
            if (control === 'qualityMenu' && !is.empty(this.config.qualityMenu)) {
                const wrapper = createElement(
                    'div',
                    extend({}, defaultAttributes, {
                        class: `${defaultAttributes.class} vide__menu`.trim(),
                        hidden: '',
                    }),
                );

                wrapper.appendChild(
                    createButton.call(this, 'quality-menu', {
                        'aria-haspopup': true,
                        'aria-controls': `vide-qualityMenu-${data.id}`,
                        'aria-expanded': false,
                    }),
                );

                const popup = createElement('div', {
                    class: 'vide__menu__container',
                    id: `vide-qualityMenu-${data.id}`,
                    hidden: '',
                });

                const inner = createElement('div');

                // Create the menu
                const menu = createElement('div', {
                    role: 'menu',
                });

                // Build the menu items
                this.config.qualityMenu.forEach((type) => {
                    // TODO: bundle this with the createMenuItem helper and bindings
                    const menuItem = createElement(
                        'button',
                        extend(getAttributesFromSelector(this.config.selectors.buttons.qualityMenu), {
                            type: 'button',
                            class: `${this.config.classNames.control} ${this.config.classNames.control}--forward`,
                            role: 'menuitem',
                            'aria-haspopup': true
                        }),
                    );

                    // Bind menu shortcuts for keyboard users
                    bindMenuItemShortcuts.call(this, menuItem, type);

                    const flex = createElement('span', null, i18n.get(type, this.config));

                    const value = createElement('span', {
                        class: this.config.classNames.menu.value,
                    });

                    // Speed contains HTML entities
                    value.innerHTML = data[type];

                    flex.appendChild(value);
                    menuItem.appendChild(flex);
                    menu.appendChild(menuItem);

                    // Build the panes
                    const pane = createElement('div', {
                        id: `vide-qualityMenu-${data.id}-${type}`
                    });

                    // Create title
                    const title = createElement('span', {
                        class: 'title',
                    })
                    title.innerText = 'Video quality'
                    pane.appendChild(title)

                    // Go back via keyboard
                    on.call(
                        this,
                        pane,
                        'keydown',
                        (event) => {
                            if (event.key !== 'ArrowLeft') return;

                            // Prevent seek
                            event.preventDefault();
                            event.stopPropagation();

                            // hide menu
                            controls.toggleMenu.call(this, false, 'qualityMenu');
                        },
                        false,
                    );

                    // Menu
                    pane.appendChild(
                        createElement('div', {
                            role: 'menu',
                        }),
                    );

                    inner.appendChild(pane);

                    this.elements.qualityMenu.buttons[type] = menuItem;
                    this.elements.qualityMenu.panels[type] = pane;
                });

                popup.appendChild(inner);
                wrapper.appendChild(popup);
                bottomControls.appendChild(wrapper);

                this.elements.qualityMenu.popup = popup;
                this.elements.qualityMenu.menu = wrapper;
            }

            // Audio tracks menu
            if (control === 'audioTracksMenu' && !is.empty(this.config.audioTracksMenu)) {
                const wrapper = createElement(
                    'div',
                    extend({}, defaultAttributes, {
                        class: `${defaultAttributes.class} vide__menu`.trim(),
                        hidden: '',
                    }),
                );

                wrapper.appendChild(
                    createButton.call(this, 'audio-tracks-menu', {
                        'aria-haspopup': true,
                        'aria-controls': `vide-audioTracksMenu-${data.id}`,
                        'aria-expanded': false,
                    }),
                );

                const popup = createElement('div', {
                    class: 'vide__menu__container',
                    id: `vide-audioTracksMenu-${data.id}`,
                    hidden: '',
                });

                const inner = createElement('div');

                // Create the menu
                const menu = createElement('div', {
                    role: 'menu',
                })

                // Build the menu items
                this.config.audioTracksMenu.forEach((type) => {
                    // TODO: bundle this with the createMenuItem helper and bindings
                    const menuItem = createElement(
                        'button',
                        extend(getAttributesFromSelector(this.config.selectors.buttons.audioTracksMenu), {
                            type: 'button',
                            class: `${this.config.classNames.control} ${this.config.classNames.control}--forward`,
                            role: 'menuitem',
                            'aria-haspopup': true
                        }),
                    )

                    // Bind menu shortcuts for keyboard users
                    bindMenuItemShortcuts.call(this, menuItem, type)

                    const flex = createElement('span', null, i18n.get(type, this.config))

                    const value = createElement('span', {
                        class: this.config.classNames.menu.value,
                    })

                    // Speed contains HTML entities
                    value.innerHTML = data[type]

                    flex.appendChild(value)
                    menuItem.appendChild(flex)
                    menu.appendChild(menuItem)

                    // Build the panes
                    const pane = createElement('div', {
                        id: `vide-audioTracks-${data.id}-${type}`
                    })

                    // Go back via keyboard
                    on.call(
                        this,
                        pane,
                        'keydown',
                        (event) => {
                            if (event.key !== 'ArrowLeft') return;

                            // Prevent seek
                            event.preventDefault();
                            event.stopPropagation();

                            // hide menu
                            controls.toggleMenu.call(this, false, 'audioTracks');
                        },
                        false,
                    )

                    // Menu
                    pane.appendChild(
                        createElement('div', {
                            role: 'menu',
                        }),
                    )

                    inner.appendChild(pane)

                    this.elements.audioTracksMenu.buttons[type] = menuItem
                    this.elements.audioTracksMenu.panels[type] = pane
                });

                popup.appendChild(inner)
                wrapper.appendChild(popup)
                bottomControls.appendChild(wrapper)

                this.elements.audioTracksMenu.popup = popup
                this.elements.audioTracksMenu.menu = wrapper
            }

            // Settings button / menu
            if (control === 'settings') {
                const wrapper = createElement(
                    'div',
                    extend({}, defaultAttributes, {
                        class: `${defaultAttributes.class} vide__menu`.trim(),
                        //hidden: '',
                    }),
                );

                wrapper.appendChild(
                    createButton.call(this, 'settings', {
                        'aria-haspopup': true,
                        'aria-controls': `vide-settings-${data.id}`,
                        'aria-expanded': false,
                    }),
                );

                const popup = createElement('div', {
                    class: 'vide__menu__container vide__menu__container--settings',
                    id: `vide-settings-${data.id}`,
                    hidden: '',
                });

                const inner = createElement('div');

                const panels = ['speed', 'options']
                const labels = {
                    speed: 'Playback speed',
                    options: 'Settings'
                }

                panels.forEach(type => {
                    // Create the menu
                    const menu = createElement('div', {
                        role: 'menu',
                    })

                    // Build the panes
                    const pane = createElement('div', {
                        class: 'menuInnerContent',
                        id: `vide-settings-${data.id}-${type}`,
                    })

                    // Create title
                    const title = createElement('span', {
                        class: 'title',
                    })
                    title.innerText = labels[type]
                    pane.appendChild(title)

                    pane.appendChild(menu)
                    inner.appendChild(pane)

                    // Build speed menu
                    if (type === 'speed') {
                        const menuItem = createElement(
                            'button',
                            extend(getAttributesFromSelector(this.config.selectors.buttons.speedMenu), {
                                type: 'button',
                                class: `${this.config.classNames.control} ${this.config.classNames.control}--forward`,
                                role: 'menuitem',
                                'aria-haspopup': true
                            }),
                        )

                        this.elements.speedMenu.buttons[type] = menuItem;
                        this.elements.speedMenu.panels[type] = pane;
                    }

                    // Build the settings options
                    if (type === 'options') {
                        controls.createSettingsOptions.call(this, menu)
                    }
                })

                popup.appendChild(inner);
                wrapper.appendChild(popup);
                bottomControls.appendChild(wrapper);

                this.elements.settings.popup = popup;
                this.elements.settings.menu = wrapper;
            }

            // Picture in picture button
            if (control === 'pip' && support.pip) {
                topContainer.appendChild(createButton.call(this, 'pip', defaultAttributes));
            }

            // chromecast
            if (control === 'cast' && this?.cast?.isSupported) {
                const button = createButton.call(this, 'cast', defaultAttributes)

                on.call(this, button, 'click', () => {
                    this.cast.connect()
                })

                topContainer.appendChild(button)
            }

            // Airplay button
            if (control === 'airplay' && support.airplay) {
                topContainer.appendChild(createButton.call(this, 'airplay', defaultAttributes));
            }

            // Download button
            if (control === 'download') {
                const attributes = extend({}, defaultAttributes, {
                    element: 'a',
                    href: this.download,
                    target: '_blank',
                });

                // Set download attribute for HTML5 only
                if (this.isHTML5) {
                    attributes.download = '';
                }

                const { download } = this.config.urls;

                if (!is.url(download) && this.isEmbed) {
                    extend(attributes, {
                        icon: `logo-${this.provider}`,
                        label: this.provider,
                    });
                }

                topContainer.appendChild(createButton.call(this, 'download', attributes));
            }

            // Toggle fullscreen button
            if (control === 'fullscreen') {
                bottomControls.appendChild(createButton.call(this, 'fullscreen', defaultAttributes));
            }
        });

        // Set available quality levels
        if (this.isHTML5) {
            setQualityMenu.call(this, html5.getQualityOptions.call(this));
        }

        setSpeedMenu.call(this)
        setAudioTracksMenu.call(this)

        // Skip intro button
        if (this.config?.skipIntro?.enabled && this.config?.skipIntro?.seconds > this.currentTime) {
            const skipButton = controls.createButton.call(this, 'skipButton', {
                class: 'skipButton',
                icon: null,
                hidden: true
            })

            skipButton.innerHTML += '<span>Skip intro</span>'
            const chevrons = controls.createIcon.call(this, 'chevrons', {
                class: 'chevrons',
            })
            skipButton.appendChild(chevrons)

            on.call(this, skipButton, 'click', (event) => {
                event.stopPropagation()
                event.preventDefault()

                this.currentTime = this.config?.skipIntro?.seconds || this.currentTime || 0
                skipButton.hidden = true
            }, false)

            this.elements.container.appendChild(skipButton)
        }

        // Client logo
        if (this.config?.clientLogo) {
            const logo = createElement('img', {
                class: 'clientLogo',
                src: this.config.clientLogo
            })

            topContainer.appendChild(logo)
        }

        bottomContainer.appendChild(bottomControls)
        this.elements.container.appendChild(bottomContainer)
        this.elements.container.appendChild(topContainer)
        this.elements.container.appendChild(centerContainer)

        return container;
    },

    // Insert controls
    inject() {
        // Sprite
        if (this.config.loadSprite) {
            const icon = controls.getIconUrl.call(this);

            // Only load external sprite using AJAX
            if (icon.cors) {
                loadSprite(icon.url, 'sprite-vide');
            }
        }

        // Create a unique ID
        this.id = Math.floor(Math.random() * 10000);

        // Null by default
        let container = null;
        this.elements.controls = null;

        // Set template properties
        const props = {
            id: this.id,
            seektime: this.config.seekTime,
            title: this.config.title,
        };
        let update = true;

        // If function, run it and use output
        if (is.function(this.config.controls)) {
            this.config.controls = this.config.controls.call(this, props);
        }

        // Convert falsy controls to empty array (primarily for empty strings)
        if (!this.config.controls) {
            this.config.controls = [];
        }

        if (is.element(this.config.controls) || is.string(this.config.controls)) {
            // HTMLElement or Non-empty string passed as the option
            container = this.config.controls;
        } else {
            // Create controls
            container = controls.create.call(this, {
                id: this.id,
                seektime: this.config.seekTime,
                speed: this.speed,
                quality: this.quality,
                captions: captions.getLabel.call(this),
                // TODO: Looping
                // loop: 'None',
            });
            update = false;
        }

        // Replace props with their value
        const replace = (input) => {
            let result = input;

            Object.entries(props).forEach(([key, value]) => {
                result = replaceAll(result, `{${key}}`, value);
            });

            return result;
        };

        // Update markup
        if (update) {
            if (is.string(this.config.controls)) {
                container = replace(container);
            }
        }

        // Controls container
        let target;

        // Inject to custom location
        if (is.string(this.config.selectors.controls.container)) {
            target = document.querySelector(this.config.selectors.controls.container);
        }

        // Inject into the container by default
        if (!is.element(target)) {
            target = this.elements.container;
        }

        // Inject controls HTML (needs to be before captions, hence "afterbegin")
        const insertMethod = is.element(container) ? 'insertAdjacentElement' : 'insertAdjacentHTML';
        target[insertMethod]('afterbegin', container);

        // Find the elements if need be
        if (!is.element(this.elements.controls)) {
            controls.findElements.call(this);
        }

        // Add pressed property to buttons
        if (!is.empty(this.elements.buttons)) {
            const addProperty = (button) => {
                const className = this.config.classNames.controlPressed;
                Object.defineProperty(button, 'pressed', {
                    enumerable: true,
                    get() {
                        return hasClass(button, className);
                    },
                    set(pressed = false) {
                        toggleClass(button, className, pressed);
                    },
                });
            };

            // Toggle classname when pressed property is set
            Object.values(this.elements.buttons)
                .filter(Boolean)
                .forEach((button) => {
                    if (is.array(button) || is.nodeList(button)) {
                        Array.from(button).filter(Boolean).forEach(addProperty);
                    } else {
                        addProperty(button);
                    }
                });
        }

        // Edge sometimes doesn't finish the paint so force a repaint
        if (browser.isEdge) {
            repaint(target);
        }

        // Setup tooltips
        if (this.config.tooltips.controls) {
            const { classNames, selectors } = this.config;
            const selector = `${selectors.controls.wrapper} ${selectors.labels} .${classNames.hidden}`;
            const labels = getElements.call(this, selector);

            Array.from(labels).forEach((label) => {
                toggleClass(label, this.config.classNames.hidden, false);
                toggleClass(label, this.config.classNames.tooltip, true);
            });
        }
    },

    // Set media metadata
    setMediaMetadata() {
        try {
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new window.MediaMetadata({
                    title: this.config.mediaMetadata.title,
                    artist: this.config.mediaMetadata.artist,
                    album: this.config.mediaMetadata.album,
                    artwork: this.config.mediaMetadata.artwork,
                });
            }
        } catch (_) {
            // Do nothing
        }
    },

    // Add markers
    setMarkers() {
        if (!this.duration || this.elements.markers) return;

        // Get valid points
        const points = this.config.markers?.points?.filter(({ time }) => time > 0 && time < this.duration);
        if (!points?.length) return;

        const containerFragment = document.createDocumentFragment();
        const pointsFragment = document.createDocumentFragment();
        let tipElement = null;
        const tipVisible = `${this.config.classNames.tooltip}--visible`;
        const toggleTip = (show) => toggleClass(tipElement, tipVisible, show);

        // Inject markers to progress container
        points.forEach((point) => {
            const markerElement = createElement(
                'span',
                {
                    class: this.config.classNames.marker,
                },
                '',
            );

            const left = `${(point.time / this.duration) * 100}%`;

            if (tipElement) {
                // Show on hover
                markerElement.addEventListener('mouseenter', () => {
                    if (point.label) return;
                    tipElement.style.left = left;
                    tipElement.innerHTML = point.label;
                    toggleTip(true);
                });

                // Hide on leave
                markerElement.addEventListener('mouseleave', () => {
                    toggleTip(false);
                });
            }

            markerElement.addEventListener('click', () => {
                this.currentTime = point.time;
            });

            markerElement.style.left = left;
            pointsFragment.appendChild(markerElement);
        });

        containerFragment.appendChild(pointsFragment);

        // Inject a tooltip if needed
        if (!this.config.tooltips.seek) {
            tipElement = createElement(
                'span',
                {
                    class: this.config.classNames.tooltip,
                },
                '',
            );

            containerFragment.appendChild(tipElement);
        }

        this.elements.markers = {
            points: pointsFragment,
            tip: tipElement,
        };

        this.elements.progress.appendChild(containerFragment);
    },
};

export default controls;
