(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.App = factory());
}(this, (function () { 'use strict';

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    /* wwwroot\js\components\SvelteLogo.svelte generated by Svelte v3.46.6 */

    function create_fragment(ctx) {
    	let t;
    	let canvas_1;

    	return {
    		c() {
    			t = space();
    			canvas_1 = element("canvas");
    			attr(canvas_1, "width", 32);
    			attr(canvas_1, "height", 32);
    			attr(canvas_1, "class", "svelte-1mvjxco");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    			insert(target, canvas_1, anchor);
    			/*canvas_1_binding*/ ctx[1](canvas_1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    			if (detaching) detach(canvas_1);
    			/*canvas_1_binding*/ ctx[1](null);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let canvas;

    	onMount(() => {
    		const ctx = canvas.getContext('2d');
    		let frame;

    		(function loop() {
    			frame = requestAnimationFrame(loop);
    			const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    			for (let p = 0; p < imageData.data.length; p += 4) {
    				const i = p / 4;
    				const x = i % canvas.width;
    				const y = i / canvas.height >>> 0;
    				const t = window.performance.now();
    				const r = 64 + 128 * x / canvas.width + 64 * Math.sin(t / 1000);
    				const g = 64 + 128 * y / canvas.height + 64 * Math.cos(t / 1400);
    				const b = 128;
    				imageData.data[p + 0] = r;
    				imageData.data[p + 1] = g;
    				imageData.data[p + 2] = b;
    				imageData.data[p + 3] = 255;
    			}

    			ctx.putImageData(imageData, 0, 0);
    		})();

    		return () => {
    			cancelAnimationFrame(frame);
    		};
    	});

    	function canvas_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			canvas = $$value;
    			$$invalidate(0, canvas);
    		});
    	}

    	return [canvas, canvas_1_binding];
    }

    class SvelteLogo extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    /* wwwroot\js\components\Clock.svelte generated by Svelte v3.46.6 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    // (74:8) {#each [1, 2, 3, 4] as offset}
    function create_each_block_1(ctx) {
    	let line;

    	return {
    		c() {
    			line = svg_element("line");
    			attr(line, "class", "minor svelte-1p5wnm2");
    			attr(line, "y1", "42");
    			attr(line, "y2", "45");
    			attr(line, "transform", "rotate(" + 6 * (/*minute*/ ctx[4] + /*offset*/ ctx[7]) + ")");
    		},
    		m(target, anchor) {
    			insert(target, line, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(line);
    		}
    	};
    }

    // (66:4) {#each [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as minute}
    function create_each_block(ctx) {
    	let line;
    	let each_1_anchor;
    	let each_value_1 = [1, 2, 3, 4];
    	let each_blocks = [];

    	for (let i = 0; i < 4; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	return {
    		c() {
    			line = svg_element("line");

    			for (let i = 0; i < 4; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr(line, "class", "major svelte-1p5wnm2");
    			attr(line, "y1", "35");
    			attr(line, "y2", "45");
    			attr(line, "transform", "rotate(" + 30 * /*minute*/ ctx[4] + ")");
    		},
    		m(target, anchor) {
    			insert(target, line, anchor);

    			for (let i = 0; i < 4; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(line);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let svg;
    	let circle;
    	let line0;
    	let line0_transform_value;
    	let line1;
    	let line1_transform_value;
    	let g;
    	let line2;
    	let line3;
    	let g_transform_value;
    	let each_value = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    	let each_blocks = [];

    	for (let i = 0; i < 12; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			svg = svg_element("svg");
    			circle = svg_element("circle");

    			for (let i = 0; i < 12; i += 1) {
    				each_blocks[i].c();
    			}

    			line0 = svg_element("line");
    			line1 = svg_element("line");
    			g = svg_element("g");
    			line2 = svg_element("line");
    			line3 = svg_element("line");
    			attr(circle, "class", "clock-face svelte-1p5wnm2");
    			attr(circle, "r", "48");
    			attr(line0, "class", "hour svelte-1p5wnm2");
    			attr(line0, "y1", "2");
    			attr(line0, "y2", "-20");
    			attr(line0, "transform", line0_transform_value = "rotate(" + (30 * /*hours*/ ctx[2] + /*minutes*/ ctx[1] / 2) + ")");
    			attr(line1, "class", "minute svelte-1p5wnm2");
    			attr(line1, "y1", "4");
    			attr(line1, "y2", "-30");
    			attr(line1, "transform", line1_transform_value = "rotate(" + (6 * /*minutes*/ ctx[1] + /*seconds*/ ctx[0] / 10) + ")");
    			attr(line2, "class", "second svelte-1p5wnm2");
    			attr(line2, "y1", "10");
    			attr(line2, "y2", "-38");
    			attr(line3, "class", "second-counterweight svelte-1p5wnm2");
    			attr(line3, "y1", "10");
    			attr(line3, "y2", "2");
    			attr(g, "transform", g_transform_value = "rotate(" + 6 * /*seconds*/ ctx[0] + ")");
    			attr(svg, "viewBox", "-50 -50 100 100");
    			attr(svg, "class", "svelte-1p5wnm2");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, circle);

    			for (let i = 0; i < 12; i += 1) {
    				each_blocks[i].m(svg, null);
    			}

    			append(svg, line0);
    			append(svg, line1);
    			append(svg, g);
    			append(g, line2);
    			append(g, line3);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*hours, minutes*/ 6 && line0_transform_value !== (line0_transform_value = "rotate(" + (30 * /*hours*/ ctx[2] + /*minutes*/ ctx[1] / 2) + ")")) {
    				attr(line0, "transform", line0_transform_value);
    			}

    			if (dirty & /*minutes, seconds*/ 3 && line1_transform_value !== (line1_transform_value = "rotate(" + (6 * /*minutes*/ ctx[1] + /*seconds*/ ctx[0] / 10) + ")")) {
    				attr(line1, "transform", line1_transform_value);
    			}

    			if (dirty & /*seconds*/ 1 && g_transform_value !== (g_transform_value = "rotate(" + 6 * /*seconds*/ ctx[0] + ")")) {
    				attr(g, "transform", g_transform_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(svg);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let hours;
    	let minutes;
    	let seconds;
    	let time = new Date();

    	onMount(() => {
    		const interval = setInterval(
    			() => {
    				$$invalidate(3, time = new Date());
    			},
    			1000
    		);

    		return () => {
    			clearInterval(interval);
    		};
    	});

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*time*/ 8) {
    			// these automatically update when `time`
    			// changes, because of the `$:` prefix
    			$$invalidate(2, hours = time.getHours());
    		}

    		if ($$self.$$.dirty & /*time*/ 8) {
    			$$invalidate(1, minutes = time.getMinutes());
    		}

    		if ($$self.$$.dirty & /*time*/ 8) {
    			$$invalidate(0, seconds = time.getSeconds());
    		}
    	};

    	return [seconds, minutes, hours, time];
    }

    class Clock extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});
    	}
    }

    /* wwwroot\js\App.svelte generated by Svelte v3.46.6 */

    function create_fragment$2(ctx) {
    	let main;
    	let logo;
    	let t0;
    	let div;
    	let h1;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let p;
    	let t6;
    	let clock;
    	let current;
    	logo = new SvelteLogo({});
    	clock = new Clock({});

    	return {
    		c() {
    			main = element("main");
    			create_component(logo.$$.fragment);
    			t0 = space();
    			div = element("div");
    			h1 = element("h1");
    			t1 = text("Hello ");
    			t2 = text(/*name*/ ctx[0]);
    			t3 = text("!");
    			t4 = space();
    			p = element("p");
    			p.textContent = "how are you doing?";
    			t6 = space();
    			create_component(clock.$$.fragment);
    			attr(h1, "id", /*id*/ ctx[1]);
    			attr(h1, "class", "svelte-1lj6k5d");
    			attr(main, "class", "d-flex");
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);
    			mount_component(logo, main, null);
    			append(main, t0);
    			append(main, div);
    			append(div, h1);
    			append(h1, t1);
    			append(h1, t2);
    			append(h1, t3);
    			append(div, t4);
    			append(div, p);
    			append(main, t6);
    			mount_component(clock, main, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*name*/ 1) set_data(t2, /*name*/ ctx[0]);

    			if (!current || dirty & /*id*/ 2) {
    				attr(h1, "id", /*id*/ ctx[1]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(logo.$$.fragment, local);
    			transition_in(clock.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(logo.$$.fragment, local);
    			transition_out(clock.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(main);
    			destroy_component(logo);
    			destroy_component(clock);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { name } = $$props;
    	let { id } = $$props;

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('id' in $$props) $$invalidate(1, id = $$props.id);
    	};

    	return [name, id];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { name: 0, id: 1 });
    	}
    }

    return App;

})));
//# sourceMappingURL=App.js.map
