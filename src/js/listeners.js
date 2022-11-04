// ==========================================================================
// Plyr Event Listeners
// ==========================================================================

import controls from './controls';
import ui from './ui';
import { repaint } from './utils/animation';
import browser from './utils/browser';
import { getElement, getElements, matches, toggleClass, toggleHidden } from './utils/elements';
import { off, on, once, toggleListener, triggerEvent } from './utils/events';
import is from './utils/is';
import { silencePromise } from './utils/promise';
import { getAspectRatio, getViewportSize, supportsCSS } from './utils/style';

class Listeners {
    constructor(player) {
        this.player = player;
        this.lastKey = null;
        this.focusTimer = null;
        this.lastKeyDown = null;

        this.handleKey = this.handleKey.bind(this);
        this.toggleMenu = this.toggleMenu.bind(this);
        this.setTabFocus = this.setTabFocus.bind(this);
        this.firstTouch = this.firstTouch.bind(this);
    }

    // Handle key presses
    handleKey(event) {
        const { player } = this;
        const { elements } = player;
        const { key, type, altKey, ctrlKey, metaKey, shiftKey, code } = event;
        const pressed = type === 'keydown';
        const repeat = pressed && key === this.lastKey;

        ui.toggleControls.call(player, true);

        // Bail if a modifier key is set
        if (altKey || ctrlKey || metaKey || shiftKey) {
            return;
        }

        // If the event is bubbled from the media element
        // Firefox doesn't get the key for whatever reason
        if (!key) {
            return;
        }

        // Seek by increment
        const seekByIncrement = (increment) => {
            // Divide the max duration into 10th's and times by the number value
            player.currentTime = (player.duration / 10) * increment;
        };

        // Handle the key on keydown
        // Reset on keyup
        if (pressed) {
            // Check focused element
            // and if the focused element is not editable (e.g. text input)
            // and any that accept key input http://webaim.org/techniques/keyboard/
            const focused = document.activeElement;
            if (is.element(focused)) {
                const { editable } = player.config.selectors;
                const { seek } = elements.inputs;

                if (focused !== seek && matches(focused, editable)) {
                    return;
                }

                if (event.key === 'Space' && matches(focused, 'button, [role^="menuitem"]')) {
                    return;
                }
            }

            // Which keys should we prevent default
            const preventDefault = [
                'Space',
                'ArrowLeft',
                'ArrowUp',
                'ArrowRight',
                'ArrowDown',
                '0',
                '1',
                '2',
                '3',
                '4',
                '5',
                '6',
                '7',
                '8',
                '9',
                'c',
                'f',
                'k',
                'l',
                'm',
            ];

            // If the key is found prevent default (e.g. prevent scrolling for arrows)
            if (preventDefault.includes(key)) {
                event.preventDefault();
                event.stopPropagation();
            }

            switch (key) {
                case '0':
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                    if (!repeat) {
                        seekByIncrement(parseInt(key, 10));
                    }
                    break;

                case 'Space':
                case 'k':
                    if (!repeat) {
                        silencePromise(player.togglePlay());
                    }
                    break;

                case 'ArrowUp':
                    player.increaseVolume(0.1);
                    break;

                case 'ArrowDown':
                    player.decreaseVolume(0.1);
                    break;

                case 'm':
                    if (!repeat) {
                        player.muted = !player.muted;
                    }
                    break;

                case 'ArrowRight':
                    player.forward();
                    this.tempScale(elements.buttons.forwardLarge)
                    break;

                case 'ArrowLeft':
                    player.rewind()
                    this.tempScale(elements.buttons.backwardLarge)
                    break;

                case 'f':
                    player.fullscreen.toggle();
                    break;

                case 'c':
                    if (!repeat) {
                        player.toggleCaptions();
                    }
                    break;

                case 'l':
                    player.loop = !player.loop;
                    break;

                default:
                    break;
            }

            if (key !== 'Space' && code === 'Space' && !repeat) {
                silencePromise(player.togglePlay())
            }

            // Escape is handle natively when in full screen
            // So we only need to worry about non native
            if (key === 'Escape' && !player.fullscreen.usingNative && player.fullscreen.active) {
                player.fullscreen.toggle();
            }

            // Store last key for next cycle
            this.lastKey = key;
        } else {
            this.lastKey = null;
        }
    }

    // Toggle menu
    toggleMenu(event, key = 'settings') {
        const types = ['captionsMenu', 'speedMenu', 'audioTracksMenu', 'qualityMenu', 'settings']

        types.filter(item => item !== key).forEach(type => {
            controls.toggleMenu.call(this.player, event, type)
        })

        controls.toggleMenu.call(this.player, event, key)
    }

    // Device is touch enabled
    firstTouch = () => {
        const { player } = this;
        const { elements } = player;

        player.touch = true;

        // Add touch class
        toggleClass(elements.container, player.config.classNames.isTouch, true);
    };

    setTabFocus = (event) => {
        const { player } = this;
        const { elements } = player;
        const { key, type, timeStamp } = event;

        clearTimeout(this.focusTimer);

        // Ignore any key other than tab
        if (type === 'keydown' && key !== 'Tab') {
            return;
        }

        // Store reference to event timeStamp
        if (type === 'keydown') {
            this.lastKeyDown = timeStamp;
        }

        // Remove current classes
        const removeCurrent = () => {
            const className = player.config.classNames.tabFocus;
            const current = getElements.call(player, `.${className}`);
            toggleClass(current, className, false);
        };

        // Determine if a key was pressed to trigger this event
        const wasKeyDown = timeStamp - this.lastKeyDown <= 20;

        // Ignore focus events if a key was pressed prior
        if (type === 'focus' && !wasKeyDown) {
            return;
        }

        // Remove all current
        removeCurrent();

        // Delay the adding of classname until the focus has changed
        // This event fires before the focusin event
        if (type !== 'focusout') {
            this.focusTimer = setTimeout(() => {
                const focused = document.activeElement;

                // Ignore if current focus element isn't inside the player
                if (!elements.container.contains(focused)) {
                    return;
                }

                toggleClass(document.activeElement, player.config.classNames.tabFocus, true);
            }, 10);
        }
    };

    // Global window & document listeners
    global = (toggle = true) => {
        const { player } = this;

        // Keyboard shortcuts
        if (player.config.keyboard.global) {
            toggleListener.call(player, window, 'keydown keyup', this.handleKey, toggle, false);
        }

        // Click anywhere closes menu
        toggleListener.call(player, document.body, 'click', (event) => {
            const element = event.target

            // check if clicked element is menu button
            if (element === player.elements.buttons.settings)
                return

            if (element === player.elements.buttons.captionsMenu)
                return

            if (element === player.elements.buttons.qualityMenu)
                return

            // check if clicked element is not inside a menu
            if (player?.elements?.settings?.popup?.contains(element))
                return

            if (player?.elements?.captionsMenu?.popup?.contains(element))
                return

            if (player?.elements?.qualityMenu?.popup?.contains(element))
                return

            this.toggleMenu(event)
        }, toggle)

        // Detect touch by events
        once.call(player, document.body, 'touchstart', this.firstTouch);

        // Tab focus detection
        toggleListener.call(player, document.body, 'keydown focus blur focusout', this.setTabFocus, toggle, false, true);
    };

    // Container listeners
    container = () => {
        const { player } = this;
        const { config, elements, timers } = player;

        // Keyboard shortcuts
        if (!config.keyboard.global && config.keyboard.focused) {
            on.call(player, elements.container, 'keydown keyup', this.handleKey, false);
        }

        // Toggle controls on mouse events and entering fullscreen
        on.call(
            player,
            elements.container,
            'mousemove mouseover mouseenter mouseleave touchstart touchmove enterfullscreen exitfullscreen',
            (event) => {
                const { controls: controlsElement, bottomControls, topControls } = elements

                // Remove button states for fullscreen
                if (controlsElement && event.type === 'enterfullscreen') {
                    controlsElement.pressed = false;
                    controlsElement.hover = false;

                    bottomControls.pressed = false;
                    bottomControls.hover = false;

                    topControls.pressed = false;
                    topControls.hover = false;
                }

                // Show, then hide after a timeout unless another control event occurs
                const show = ['touchstart', 'touchmove', 'mousemove', 'mouseover', 'mouseenter'].includes(event.type);

                let delay = 1500

                if (show) {
                    ui.toggleControls.call(player, true);
                    // Use longer timeout for touch devices
                    delay = player.touch ? 2000 : 1500;
                } else {
                    // Clear timer
                    clearTimeout(timers.controls)

                    // Set new timer to prevent flicker when seeking
                    timers.controls = setTimeout(() => ui.toggleControls.call(player, false), delay);
                }
            },
        );

        // Set a gutter for Vimeo
        const setGutter = () => {
            if (!player.isVimeo || player.config.vimeo.premium) {
                return;
            }

            const target = elements.wrapper;
            const { active } = player.fullscreen;
            const [videoWidth, videoHeight] = getAspectRatio.call(player);
            const useNativeAspectRatio = supportsCSS(`aspect-ratio: ${videoWidth} / ${videoHeight}`);

            // If not active, remove styles
            if (!active) {
                if (useNativeAspectRatio) {
                    target.style.width = null;
                    target.style.height = null;
                } else {
                    target.style.maxWidth = null;
                    target.style.margin = null;
                }
                return;
            }

            // Determine which dimension will overflow and constrain view
            const [viewportWidth, viewportHeight] = getViewportSize();
            const overflow = viewportWidth / viewportHeight > videoWidth / videoHeight;

            if (useNativeAspectRatio) {
                target.style.width = overflow ? 'auto' : '100%';
                target.style.height = overflow ? '100%' : 'auto';
            } else {
                target.style.maxWidth = overflow ? `${(viewportHeight / videoHeight) * videoWidth}px` : null;
                target.style.margin = overflow ? '0 auto' : null;
            }
        };

        // Handle resizing
        const resized = () => {
            clearTimeout(timers.resized);
            timers.resized = setTimeout(setGutter, 50);
        };

        on.call(player, elements.container, 'enterfullscreen exitfullscreen', (event) => {
            const { target } = player.fullscreen;

            // Ignore events not from target
            if (target !== elements.container) {
                return;
            }

            // If it's not an embed and no ratio specified
            if (!player.isEmbed && is.empty(player.config.ratio)) {
                return;
            }

            // Set Vimeo gutter
            setGutter();

            // Watch for resizes
            const method = event.type === 'enterfullscreen' ? on : off;
            method.call(player, window, 'resize', resized);
        });
    };

    // Listen for media events
    media = () => {
        const { player } = this;
        const { elements } = player;

        // Time change on media
        on.call(player, player.media, 'timeupdate seeking seeked', (event) => {
            if (player.config?.skipIntro?.enabled) {
                if (player.currentTime > player.config?.skipIntro?.seconds)
                    player.elements.buttons.skipbutton.hidden = true

                if (player.currentTime < player.config?.skipIntro?.seconds)
                    player.elements.buttons.skipbutton.hidden = false
            }

            controls.timeUpdate.call(player, event)
        })

        // Display duration
        on.call(player, player.media, 'durationchange loadeddata loadedmetadata', (event) =>
            controls.durationUpdate.call(player, event),
        );

        // Handle the media finishing
        on.call(player, player.media, 'ended', () => {
            // Show poster on end
            if (player.isHTML5 && player.isVideo && player.config.resetOnEnd) {
                // Restart
                player.restart();

                // Call pause otherwise IE11 will start playing the video again
                player.pause();
            }
        });

        // Check for buffer progress
        on.call(player, player.media, 'progress playing seeking seeked', (event) =>
            controls.updateProgress.call(player, event),
        );

        // Handle volume changes
        on.call(player, player.media, 'volumechange', (event) => controls.updateVolume.call(player, event));

        // Handle seeked events
        on.call(player, player.media, 'seeked', (event) => {
            player.timers.seeked = 3000

            setTimeout(() => {
                player.timers.seeked = 0
            }, 3000)
        })

        // Handle play/pause
        on.call(player, player.media, 'playing play pause ended emptied timeupdate', (event) =>
            ui.checkPlaying.call(player, event),
        );

        // Loading state
        on.call(player, player.media, 'waiting canplay seeked playing', (event) => ui.checkLoading.call(player, event));

        // Click video
        if (player.supported.ui && player.config.clickToPlay && !player.isAudio) {
            // Re-fetch the wrapper
            const wrapper = getElement.call(player, `.${player.config.classNames.video}`);

            // Bail if there's no wrapper (this should never happen)
            if (!is.element(wrapper)) {
                return;
            }

            // On click play, pause or restart
            on.call(player, elements.container, 'click', (event) => {
                const targets = [elements.container, wrapper];

                // Ignore if click if not container or in video wrapper
                if (!targets.includes(event.target) && !wrapper.contains(event.target)) {
                    return;
                }

                // Touch devices will just show controls (if hidden)
                if (player.touch && player.config.hideControls) {
                    return;
                }

                if (player.ended) {
                    this.proxy(event, player.restart, 'restart');
                    this.proxy(
                        event,
                        () => {
                            silencePromise(player.play());
                        },
                        'play',
                    );
                } else {
                    this.proxy(
                        event,
                        () => {
                            silencePromise(player.togglePlay());
                        },
                        'play',
                    );
                }
            });
        }

        // Disable right click
        if (player.supported.ui && player.config.disableContextMenu) {
            on.call(
                player,
                elements.wrapper,
                'contextmenu',
                (event) => {
                    event.preventDefault();
                },
                false,
            );
        }

        // Volume change
        on.call(player, player.media, 'volumechange', () => {
            // Save to storage
            player.storage.set({
                volume: player.volume,
                muted: player.muted,
            });
        });

        // Speed change
        on.call(player, player.media, 'ratechange', () => {
            // Update UI
            controls.updateSetting.call(player, 'speed');

            // Save to storage
            player.storage.set({ speed: player.speed });
        });

        // Quality change
        on.call(player, player.media, 'qualitychange', (event) => {
            // Update UI
            controls.updateSetting.call(player, 'quality', null, event.detail.quality, 'qualityMenu');
        });

        // Update download link when ready and if quality changes
        on.call(player, player.media, 'ready qualitychange', () => {
            controls.setDownloadUrl.call(player);
        });

        // Proxy events to container
        // Bubble up key events for Edge
        const proxyEvents = player.config.events.concat(['keyup', 'keydown']).join(' ');

        on.call(player, player.media, proxyEvents, (event) => {
            let { detail = {} } = event;

            // Get error details from media
            if (event.type === 'error') {
                detail = player.media.error;
            }

            triggerEvent.call(player, elements.container, event.type, true, detail);
        });
    };

    // Run default and custom handlers
    proxy = (event, defaultHandler, customHandlerKey) => {
        const { player } = this;
        const customHandler = player.config.listeners[customHandlerKey];
        const hasCustomHandler = is.function(customHandler);
        let returned = true;

        // Execute custom handler
        if (hasCustomHandler) {
            returned = customHandler.call(player, event);
        }

        // Only call default handler if not prevented in custom handler
        if (returned !== false && is.function(defaultHandler)) {
            defaultHandler.call(player, event);
        }
    };

    // Custom large seek buttons animation
    tempScale = (element, time = 1000) => {
        if (!element)
            return

        element?.classList?.add('vide--tempScale')
        setTimeout(() => {
            element?.classList?.remove('vide--tempScale')
        }, time)
    }

    // Trigger custom and default handlers
    bind = (element, type, defaultHandler, customHandlerKey, passive = true) => {
        const { player } = this;
        const customHandler = player.config.listeners[customHandlerKey];
        const hasCustomHandler = is.function(customHandler);

        on.call(
            player,
            element,
            type,
            (event) => this.proxy(event, defaultHandler, customHandlerKey),
            passive && !hasCustomHandler,
        );
    };

    // Listen for control events
    controls = () => {
        const { player } = this;
        const { elements } = player;
        // IE doesn't support input event, so we fall back to change
        const inputEvent = browser.isIE ? 'change' : 'input';

        // Play/pause toggle
        if (elements.buttons.play) {
            Array.from(elements.buttons.play).forEach((button) => {
                this.bind(
                    button,
                    'click',
                    () => {
                        silencePromise(player.togglePlay());
                    },
                    'play',
                );
            });
        }

        // Save current time on local storage
        player.on('ready', controls.showWatchedInput)

        // Pause
        this.bind(elements.buttons.restart, 'click', player.restart, 'restart');

        // Rewind
        this.bind(
            elements.buttons.rewind,
            'click',
            (event) => {
                event.stopPropagation()
                event.preventDefault()

                // Record seek time so we can prevent hiding controls for a few seconds after rewind
                player.lastSeekTime = Date.now();
                player.rewind();

                this.tempScale(elements.buttons.backwardLarge)
            },
            'rewind',
            false
        );

        // Brand
        this.bind(
            elements.buttons.brand,
            'click',
            () => {
                // go to homepage
                const url = player.config.urls.brand
                if (url)
                    window.open(url, '_blank').focus()
            },
            'brand',
        );

        // Rewind
        this.bind(
            elements.buttons.fastForward,
            'click',
            (event) => {
                event.stopPropagation()
                event.preventDefault()

                // Record seek time so we can prevent hiding controls for a few seconds after fast-forward
                player.lastSeekTime = Date.now()
                player.forward()

                this.tempScale(elements.buttons.forwardLarge)
            },
            'fastForward',
            false
        );

        // forward large
        this.bind(
            elements.buttons.forwardLarge,
            'dblclick',
            (event) => {
                event.stopPropagation()
                event.preventDefault()

                // Record seek time, so we can prevent hiding controls for a few seconds after fast-forward
                player.lastSeekTime = Date.now()
                player.forward()

                this.tempScale(elements.buttons.forwardLarge)
            },
            'forwardLarge',
            false
        );

        // backward large
        this.bind(
            elements.buttons.backwardLarge,
            'dblclick',
            (event) => {
                event.stopPropagation()
                event.preventDefault()

                // Record seek time so we can prevent hiding controls for a few seconds after rewind
                player.lastSeekTime = Date.now();
                player.rewind();

                this.tempScale(elements.buttons.backwardLarge)
            },
            'backwardLarge',
            false
        );

        // Mute toggle
        this.bind(
            elements.buttons.mute,
            'click',
            () => {
                player.muted = !player.muted;
            },
            'mute',
        );

        // Captions toggle
        this.bind(elements.buttons.captions, 'click', () => player.toggleCaptions());

        // Download
        this.bind(
            elements.buttons.download,
            'click',
            () => {
                triggerEvent.call(player, player.media, 'download');
            },
            'download',
        );

        // Fullscreen toggle
        this.bind(
            elements.buttons.fullscreen,
            'click',
            () => {
                player.fullscreen.toggle();
            },
            'fullscreen',
        );

        // Picture-in-Picture
        this.bind(
            elements.buttons.pip,
            'click',
            () => {
                player.pip = 'toggle';
            },
            'pip',
        );

        // Airplay
        this.bind(elements.buttons.airplay, 'click', player.airplay, 'airplay');

        // Settings menu - click toggle
        this.bind(
            elements.buttons.settings,
            'mouseover touchstart',
            (event) => {
                // Prevent the document click listener closing the menu
                event.stopPropagation()
                event.preventDefault()

                clearTimeout(player.timers.settingsMenu)
                clearTimeout(player.timers.settingsMenuOpen)

                elements.container.classList.add(player.config.classNames.menu.open)

                const { popup } = elements.settings

                // Hide other menus
                toggleHidden(elements.qualityMenu.popup, true)
                toggleHidden(elements.captionsMenu.popup, true)

                player.timers.settingsMenuOpen = setTimeout(() => {
                    elements.container.classList.add(player.config.classNames.menu.open)
                    toggleHidden(popup, false)
                }, 200)
            },
            null,
            false,
        ); // Can't be passive as we're preventing default

        // Settings menu - click toggle
        this.bind(
            elements.settings.menu,
            'mouseleave',
            (event) => {
                // Prevent the document click listener closing the menu
                event.stopPropagation()
                event.preventDefault()

                clearTimeout(player.timers.settingsMenu)
                clearTimeout(player.timers.settingsMenuOpen)

                const { popup } = elements.settings

                player.timers.settingsMenu = setTimeout(() => {
                    if (elements.qualityMenu.popup.hidden && elements.captionsMenu.popup.hidden)
                        elements.container.classList.remove(player.config.classNames.menu.open)
                    toggleHidden(popup, true)
                }, 500)
            },
            null,
            false,
        ); // Can't be passive as we're preventing default

        // Captions menu - click toggle
        this.bind(
            elements.buttons.captionsMenu,
            'mouseover touchstart',
            (event) => {
                // Prevent the document click listener closing the menu
                event.stopPropagation()
                event.preventDefault()

                clearTimeout(player.timers.captionsMenu)
                clearTimeout(player.timers.captionsMenuOpen)

                elements.container.classList.add(player.config.classNames.menu.open)

                const { popup } = elements.captionsMenu

                // Hide other menus
                toggleHidden(elements.qualityMenu.popup, true)
                toggleHidden(elements.settings.popup, true)

                player.timers.captionsMenuOpen = setTimeout(() => {
                    elements.container.classList.add(player.config.classNames.menu.open)
                    toggleHidden(popup, false)
                }, 200)
            },
            null,
            false,
        ); // Can't be passive as we're preventing default

        // Captions menu - click toggle
        this.bind(
            elements.captionsMenu.menu,
            'mouseleave',
            (event) => {
                // Prevent the document click listener closing the menu
                event.stopPropagation()
                event.preventDefault()

                clearTimeout(player.timers.captionsMenu)
                clearTimeout(player.timers.captionsMenuOpen)

                const { popup } = elements.captionsMenu

                player.timers.captionsMenu = setTimeout(() => {
                    if (elements.qualityMenu.popup.hidden && elements.settings.popup.hidden)
                        elements.container.classList.remove(player.config.classNames.menu.open)
                    toggleHidden(popup, true)
                }, 500)
            },
            null,
            false,
        ); // Can't be passive as we're preventing default

        // Quality menu - click toggle
        this.bind(
            elements.buttons.qualityMenu,
            'mouseover touchstart',
            (event) => {
                // Prevent the document click listener closing the menu
                //event.stopPropagation()
                event.preventDefault()

                clearTimeout(player.timers.qualityMenu)
                clearTimeout(player.timers.qualityMenuOpen)

                elements.container.classList.add(player.config.classNames.menu.open)

                const { popup } = elements.qualityMenu

                // Hide other menus
                toggleHidden(elements.captionsMenu.popup, true)

                player.timers.qualityMenuOpen = setTimeout(() => {
                    elements.container.classList.add(player.config.classNames.menu.open)
                    toggleHidden(popup, false)
                }, 200)
            },
            null,
            false,
        ); // Can't be passive as we're preventing default

        // Captions menu - click toggle
        this.bind(
            elements.qualityMenu.menu,
            'mouseleave',
            (event) => {
                // Prevent the document click listener closing the menu
                event.stopPropagation()
                event.preventDefault()

                clearTimeout(player.timers.qualityMenu)
                clearTimeout(player.timers.qualityMenuOpen)

                const { popup } = elements.qualityMenu

                player.timers.qualityMenu = setTimeout(() => {
                    if (elements.captionsMenu.popup.hidden && elements.settings.popup.hidden)
                        elements.container.classList.remove(player.config.classNames.menu.open)

                    toggleHidden(popup, true)
                }, 500)
            },
            null,
            false,
        ); // Can't be passive as we're preventing default

        // Settings menu - keyboard toggle
        // We have to bind to keyup otherwise Firefox triggers a click when a keydown event handler shifts focus
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1220143
        this.bind(
            elements.buttons.settings,
            'keyup',
            (event) => {
                if (!['Space', 'Enter'].includes(event.key)) {
                    return;
                }

                // Because return triggers a click anyway, all we need to do is set focus
                if (event.key === 'Enter') {
                    controls.focusFirstMenuItem.call(player, null, true);
                    return;
                }

                // Prevent scroll
                event.preventDefault();

                // Prevent playing video (Firefox)
                event.stopPropagation();

                // Toggle menu
                controls.toggleMenu.call(player, event);
            },
            null,
            false, // Can't be passive as we're preventing default
        );

        // Escape closes menu
        this.bind(elements.settings.menu, 'keydown', (event) => {
            if (event.key === 'Escape') {
                controls.toggleMenu.call(player, event);
            }
        });

        // Set range input alternative "value", which matches the tooltip time (#954)
        this.bind(elements.inputs.seek, 'mousedown mousemove', (event) => {
            const rect = elements.progress.getBoundingClientRect();
            const percent = (100 / rect.width) * (event.pageX - rect.left);
            event.currentTarget.setAttribute('seek-value', percent);

            // update progress bar
            const bar =  elements.progress.querySelector('.vide__progress--seek')
            bar.style.width = `${percent}%`
        });

        // Pause while seeking
        this.bind(elements.inputs.seek, 'mousedown mouseup keydown keyup touchstart touchend', (event) => {
            const seek = event.currentTarget;
            const attribute = 'play-on-seeked';

            if (is.keyboardEvent(event) && !['ArrowLeft', 'ArrowRight'].includes(event.key)) {
                return;
            }

            // Record seek time so we can prevent hiding controls for a few seconds after seek
            player.lastSeekTime = Date.now();

            // Was playing before?
            const play = seek.hasAttribute(attribute);
            // Done seeking
            const done = ['mouseup', 'touchend', 'keyup'].includes(event.type);

            // If we're done seeking and it was playing, resume playback
            if (play && done) {
                seek.removeAttribute(attribute);
                silencePromise(player.play());
            } else if (!done && player.playing) {
                seek.setAttribute(attribute, '');
                //player.pause();
            }
        });

        // Fix range inputs on iOS
        // Super weird iOS bug where after you interact with an <input type="range">,
        // it takes over further interactions on the page. This is a hack
        if (browser.isIos) {
            const inputs = getElements.call(player, 'input[type="range"]');
            Array.from(inputs).forEach((input) => this.bind(input, inputEvent, (event) => repaint(event.target)));
        }

        // Seek
        this.bind(
            elements.inputs.seek,
            inputEvent,
            (event) => {
                const seek = event.currentTarget;
                // If it exists, use seek-value instead of "value" for consistency with tooltip time (#954)
                let seekTo = seek.getAttribute('seek-value');

                if (is.empty(seekTo)) {
                    seekTo = seek.value;
                }

                seek.removeAttribute('seek-value');

                player.currentTime = (seekTo / seek.max) * player.duration;
            },
            'seek',
        );

        // Seek tooltip
        this.bind(elements.progressContainer, 'mouseenter mouseleave mousemove', (event) =>
            controls.updateSeekTooltip.call(player, event),
        );

        // Preview thumbnails plugin
        // TODO: Really need to work on some sort of plug-in wide event bus or pub-sub for this
        this.bind(elements.progressContainer, 'mousemove touchmove', (event) => {
            const { previewThumbnails } = player;

            if (previewThumbnails && previewThumbnails.loaded) {
                previewThumbnails.startMove(event);
            }
        });

        // Hide thumbnail preview - on mouse click, mouse leave, and video play/seek. All four are required, e.g., for buffering
        this.bind(elements.progressContainer, 'mouseleave touchend click', () => {
            const { previewThumbnails } = player;

            if (previewThumbnails && previewThumbnails.loaded) {
                previewThumbnails.endMove(false, true);
            }
        });

        // Show scrubbing preview
        this.bind(elements.progressContainer, 'mousedown touchstart', (event) => {
            const { previewThumbnails } = player;

            if (previewThumbnails && previewThumbnails.loaded) {
                previewThumbnails.startScrubbing(event);
            }
        });

        this.bind(elements.progressContainer, 'mouseup touchend', (event) => {
            const { previewThumbnails } = player;

            if (previewThumbnails && previewThumbnails.loaded) {
                previewThumbnails.endScrubbing(event);
            }
        });

        // Polyfill for lower fill in <input type="range"> for webkit
        if (browser.isWebkit) {
            Array.from(getElements.call(player, 'input[type="range"]')).forEach((element) => {
                this.bind(element, 'input', (event) => controls.updateRangeFill.call(player, event.target));
            });
        }

        // Current time invert
        // Only if one time element is used for both currentTime and duration
        if (player.config.toggleInvert) {
            this.bind(elements.display.currentTime, 'click', () => {
                // Do nothing if we're at the start
                if (player.currentTime === 0) {
                    return;
                }

                player.config.invertTime = !player.config.invertTime;

                controls.timeUpdate.call(player);
            });
        }

        // Volume
        this.bind(
            elements.inputs.volume,
            inputEvent,
            (event) => {
                player.volume = event.target.value
            },
            'volume',
        );

        // Update controls.hover state (used for ui.toggleControls to avoid hiding when interacting)
        this.bind(elements.controls, 'mouseenter mouseleave', (event) => {
            elements.controls.hover = !player.touch && event.type === 'mouseenter';
        });

        this.bind(elements.bottomControls, 'mouseenter mouseleave', (event) => {
            elements.bottomControls.hover = !player.touch && event.type === 'mouseenter';
        });

        this.bind(elements.topControls, 'mouseenter mouseleave', (event) => {
            elements.topControls.hover = !player.touch && event.type === 'mouseenter';
        });

        // Also update controls.hover state for any non-player children of fullscreen element (as above)
        if (elements.fullscreen) {
            Array.from(elements.fullscreen.children)
                .filter((c) => !c.contains(elements.container))
                .forEach((child) => {
                    this.bind(child, 'mouseenter mouseleave', (event) => {
                        if (elements.controls) {
                            elements.controls.hover = !player.touch && event.type === 'mouseenter';
                        }

                        if (elements.topControls) {
                            elements.topControls.hover = !player.touch && event.type === 'mouseenter';
                        }

                        if (elements.bottomControls) {
                            elements.bottomControls.hover = !player.touch && event.type === 'mouseenter';
                        }
                    });
                });
        }

        // Update controls.pressed state (used for ui.toggleControls to avoid hiding when interacting)
        this.bind(elements.controls, 'mousedown mouseup touchstart touchend touchcancel', (event) => {
            elements.controls.pressed = ['mousedown', 'touchstart'].includes(event.type);
        });

        this.bind(elements.topControls, 'mousedown mouseup touchstart touchend touchcancel', (event) => {
            elements.topControls.pressed = ['mousedown', 'touchstart'].includes(event.type);
        });

        this.bind(elements.bottomControls, 'mousedown mouseup touchstart touchend touchcancel', (event) => {
            elements.bottomControls.pressed = ['mousedown', 'touchstart'].includes(event.type);
        });

        // Show controls when they receive focus (e.g., when using keyboard tab key)
        this.bind(elements.controls, 'focusin', () => {
            const { config, timers } = player;

            // Check if has menu opened
            const hasMenuOpened = !elements.qualityMenu.popup.hidden || !elements.captionsMenu.popup.hidden || !!elements.settings.popup.hidden

            if (hasMenuOpened) {
                clearTimeout(timers.controls)
                return
            }

            // Skip transitions to prevent focus from scrolling the parent element
            toggleClass(elements.controls, config.classNames.noTransition, true);

            // Toggle
            ui.toggleControls.call(player, true);

            // Restore transition
            setTimeout(() => {
                toggleClass(elements.controls, config.classNames.noTransition, false);
            }, 0);

            // Delay a little more for mouse users
            const delay = this.touch ? 1500 : 1000;

            // Clear timer
            clearTimeout(timers.controls);

            // Hide again after delay
            timers.controls = setTimeout(() => ui.toggleControls.call(player, false), delay);
        });

        this.bind(elements.bottomControls, 'focusin', () => {
            const { config, timers } = player

            // Check if has menu opened
            const hasMenuOpened = !elements.qualityMenu.popup.hidden || !elements.captionsMenu.popup.hidden || !elements.settings.popup.hidden

            if (hasMenuOpened) {
                clearTimeout(timers.bottomControls)
                return
            }

            // Skip transitions to prevent focus from scrolling the parent element
            toggleClass(elements.bottomControls, config.classNames.noTransition, true);

            // Toggle
            ui.toggleControls.call(player, true);

            // Restore transition
            setTimeout(() => {
                toggleClass(elements.bottomControls, config.classNames.noTransition, false);
            }, 0);

            // Delay a little more for mouse users
            const delay = this.touch ? 1500 : 1000;

            // Clear timer
            clearTimeout(timers.bottomControls);

            // Hide again after delay
            timers.bottomControls = setTimeout(() => ui.toggleControls.call(player, false), delay);
        });

        this.bind(elements.topControls, 'focusin', () => {
            const { config, timers } = player;

            // Check if has menu opened
            const hasMenuOpened = !elements.qualityMenu.popup.hidden || !elements.captionsMenu.popup.hidden || !!elements.settings.popup.hidden

            if (hasMenuOpened) {
                clearTimeout(timers.topControls)
                return
            }

            // Skip transition to prevent focus from scrolling the parent element
            toggleClass(elements.topControls, config.classNames.noTransition, true);

            // Toggle
            ui.toggleControls.call(player, true);

            // Restore transition
            setTimeout(() => {
                toggleClass(elements.topControls, config.classNames.noTransition, false);
            }, 0);

            // Delay a little more for mouse users
            const delay = this.touch ? 1500 : 1000;

            // Clear timer
            clearTimeout(timers.topControls);

            // Hide again after delay
            timers.topControls = setTimeout(() => ui.toggleControls.call(player, false), delay);
        });

        // Mouse wheel for volume
        this.bind(
            elements.inputs.volume,
            'wheel',
            (event) => {
                // Detect "natural" scroll - supported on OS X Safari only
                // Other browsers on OS X will be inverted until support improves
                const inverted = event.webkitDirectionInvertedFromDevice;
                // Get delta from event. Invert if `inverted` is true
                const [x, y] = [event.deltaX, -event.deltaY].map((value) => (inverted ? -value : value));
                // Using the biggest delta, normalize to 1 or -1 (or 0 if no delta)
                const direction = Math.sign(Math.abs(x) > Math.abs(y) ? x : y);

                // Change the volume by 2%
                player.increaseVolume(direction / 50);

                // Don't break page scrolling at max and min
                const { volume } = player.media;
                if ((direction === 1 && volume < 1) || (direction === -1 && volume > 0)) {
                    event.preventDefault();
                }
            },
            'volume',
            false,
        );
    };
}

export default Listeners;
