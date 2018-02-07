---
layout: post
title: 一份用于描画软件盘的代码片断
tag: [uinput,Cairo,Linux]
---


<!--break-->


```c
enum key_action {
    _KEY_ACTION_DRAW,
    _KEY_ACTION_PRESSED
};

struct key {
    const char *key;
    const char *upper;
    unsigned int code;
    int shift;
};

typedef void (*draw_t)(unsigned int color, const char *key, int x, int y, int w, int h, void *data);
typedef void (*press_t)(const struct key *key, int x, int y, int w, int h, void *data);

static unsigned int surface_width = KEYBAORD_WIDTH;
static unsigned int surface_height = KEYBAORD_HEIGHT;
static unsigned int keyHeight = 1;

static int running = TRUE;
static int changed = TRUE;
static unsigned int pressing = KEY_RESERVED;
static int pressing_shift = FALSE;

////////////////////////////////////////////////////////////////////////////////

static const struct key keyboard_map1[] = {
    {"q", "Q", KEY_Q, 0},
    {"w", "W", KEY_W, 0},
    {"e", "E", KEY_E, 0},
    {"r", "R", KEY_R, 0},
    {"t", "T", KEY_T, 0},
    {"y", "Y", KEY_Y, 0},
    {"u", "U", KEY_U, 0},
    {"i", "I", KEY_I, 0},
    {"o", "O", KEY_O, 0},
    {"p", "P", KEY_P, 0}
};
static const struct key keyboard_map2[] = {
    {"a", "A", KEY_A, 0},
    {"s", "S", KEY_S, 0},
    {"d", "D", KEY_D, 0},
    {"f", "F", KEY_F, 0},
    {"g", "G", KEY_G, 0},
    {"h", "H", KEY_H, 0},
    {"j", "J", KEY_J, 0},
    {"k", "K", KEY_K, 0},
    {"l", "L", KEY_L, 0}
};
static const struct key keyboard_map3[] = {
    {"z", "Z", KEY_Z, 0},
    {"x", "X", KEY_X, 0},
    {"c", "C", KEY_C, 0},
    {"v", "V", KEY_V, 0},
    {"b", "B", KEY_B, 0},
    {"n", "N", KEY_N, 0},
    {"m", "M", KEY_M, 0}
};

static const struct key keyboard_map[] = {
    {"1", "", KEY_1, 0},
    {"2", "", KEY_2, 0},
    {"3", "", KEY_3, 0},
    {"4", "", KEY_4, 0},
    {"5", "", KEY_5, 0},
    {"6", "", KEY_6, 0},
    {"7", "", KEY_7, 0},
    {"8", "", KEY_8, 0},
    {"9", "", KEY_9, 0},
    {"0", "", KEY_0, 0},
    {"-", "", KEY_MINUS, 0},
    {"=", "", KEY_EQUAL, 0},
    {"!", "", KEY_1, 1},
    {"@", "", KEY_2, 1},
    {"#", "", KEY_3, 1},
    {"$", "", KEY_4, 1},
    {"%", "", KEY_5, 1},
    {"^", "", KEY_6, 1},
    {"&", "", KEY_7, 1},
    {"*", "", KEY_8, 1},
    {"(", "", KEY_9, 1},
    {")", "", KEY_0, 1},
    {"_", "", KEY_MINUS, 1},
    {"+", "", KEY_EQUAL, 1},
    {"`", "", KEY_GRAVE, 0},
    {"~", "", KEY_GRAVE, 1},
    {",", "", KEY_COMMA, 0},
    {".", "", KEY_DOT, 0},
    {"?", "", KEY_SLASH, 1},
    {"|", "", KEY_BACKSLASH, 1},
    {";", "", KEY_SEMICOLON, 0},
    {":", "", KEY_SEMICOLON, 1},
    {"\'", "", KEY_APOSTROPHE, 0},
    {"\"", "", KEY_APOSTROPHE, 1},
    {"<", "", KEY_COMMA, 1},
    {">", "", KEY_DOT, 1},
    {"[", "", KEY_LEFTBRACE, 0},
    {"]", "", KEY_RIGHTBRACE, 0},
    {"{", "", KEY_LEFTBRACE, 1},
    {"}", "", KEY_RIGHTBRACE, 1},
    {"\\", "", KEY_BACKSLASH, 0},
    {"/", "", KEY_SLASH, 0}
};

static const struct key keyboard_func[] = {
    {"shift", "SHIFT", KEY_LEFTSHIFT, 0},
    {"CLOSE", "CLOSE", KEY_CLOSE, 0},
    {"SPACE", "SPACE", KEY_SPACE, 0},
    {"DEL",   "DEL",   KEY_BACKSPACE, 0},
    {"?123",  "ABC",   KEY_F13, 0}
};

static const struct key keyboard_func1[] = {
    {"ESC", "ESC", KEY_ESC, 0},
    {"/", "/", KEY_SLASH, 0},
    {"|", "|", KEY_BACKSLASH, 1},
    {"HOME", "HOME", KEY_HOME, 0},
    {"^", "^", KEY_UP, 0},
    {"END", "END", KEY_END, 0},
    {"PGUP", "PGUP", KEY_PAGEUP, 0},
    {"-", "-", KEY_MINUS, 0},
    {"FN", "FN", KEY_F14, 0},
    {"TAB", "TAB", KEY_TAB, 0},
    {"CTRL", "CTRL", KEY_LEFTCTRL, 0},
    {"ALT", "ALT", KEY_LEFTALT, 0},
    {"<", "<", KEY_LEFT, 0},
    {"v", "v", KEY_DOWN, 0},
    {">", ">", KEY_RIGHT, 0},
    {"PGDN", "PGDN", KEY_PAGEDOWN, 0},
    {"_", "_", KEY_MINUS, 1},
    {"ENTER", "ENTER", KEY_ENTER, 0}
};

static const struct key keyboard_func2[] = {
    {"F1",   "F1",   KEY_F1,  0},
    {"F2",   "F2",   KEY_F2,  0},
    {"F3",   "F3",   KEY_F3,  0},
    {"F4",   "F4",   KEY_F4,  0},
    {"F5",   "F5",   KEY_F5,  0},
    {"F6",   "F6",   KEY_F6,  0},
    {"FUNC", "FUNC", KEY_F14, 0},
    {"F7",   "F7",   KEY_F7,  0},
    {"F8",   "F8",   KEY_F8,  0},
    {"F9",   "F9",   KEY_F9,  0},
    {"F10",  "F10",  KEY_F10, 0},
    {"F11",  "F11",  KEY_F11, 0},
    {"F12",  "F12",  KEY_F12, 0}
};

////////////////////////////////////////////////////////////////////////////////

static int uinput = -1;

static void keyInput(int uinputFd, unsigned int keycode, unsigned int state)
{

    LOGF("(key=%u, sts=%u)\n", keycode, state);

    CHECK_IF_FAIL(uinputFd > 0);

    struct input_event ev;

    memset(&ev, 0, sizeof(struct input_event));

    gettimeofday(&ev.time, NULL);
    ev.type = EV_KEY;
    ev.code = keycode;
    ev.value = state;
    if(write(uinputFd, &ev, sizeof(struct input_event)) < 0) {
        LOGE("error: write : %s\n", strerror(errno));
    }

    memset(&ev, 0, sizeof(struct input_event));
    ev.type = EV_SYN;
    ev.code = SYN_REPORT;
    ev.value = 0;
    if(write(uinputFd, &ev, sizeof(struct input_event)) < 0) {
        LOGE("error: write : %s\n", strerror(errno));
    }
}

static void load_uinput(void)
{
    struct kmod_ctx *ctx;
    struct kmod_list *itr = NULL, *modlist = NULL;
    const int probe_flags = KMOD_PROBE_APPLY_BLACKLIST;
    int r = 0;

    ctx = kmod_new(NULL, NULL);
    kmod_load_resources(ctx);
    r = kmod_module_new_from_lookup(ctx, "uinput", &modlist);
    if (r < 0 || !modlist) {
        LOGE ("Failed to lookup\n");
        return;
    }
    kmod_list_foreach(itr, modlist) {
        struct kmod_module *mod;
        int state;

        mod = kmod_module_get_module(itr);
        state = kmod_module_get_initstate(mod);

        if(state != KMOD_MODULE_BUILTIN && state != KMOD_MODULE_LIVE) {
            kmod_module_probe_insert_module(mod, probe_flags, NULL, NULL, NULL, NULL);
        }

        kmod_module_unref(mod);
    }
    kmod_module_unref_list(modlist);
    kmod_unref(ctx);
}

static int uinput_create(const char *name)
{
    int uinputFd = -1;

    load_uinput();

    /* emulator : those action should be in a daemon named like hardkey-daemon. */
    uinputFd = open("/dev/uinput", O_WRONLY | O_NONBLOCK);
    if(uinputFd < 0) {
        LOGE("error: open : %s\n", strerror(errno));
        return -1;
    }

    if(ioctl(uinputFd, UI_SET_EVBIT, EV_KEY) < 0) {
        LOGE("error: ioctl : %s\n", strerror(errno));
    }

    if(ioctl(uinputFd, UI_SET_EVBIT, EV_REP) < 0) {
        LOGE("error: ioctl : %s\n", strerror(errno));
    }

    int i;
    for (i=0; i < 256; i++) {
        if(ioctl(uinputFd, UI_SET_KEYBIT, i) < 0) {
            LOGE("error: ioctl : %s\n", strerror(errno));
        }
    }

    struct uinput_user_dev uidev;
    memset(&uidev, 0, sizeof(uidev));
    snprintf(uidev.name, UINPUT_MAX_NAME_SIZE, name);
    uidev.id.bustype = BUS_USB;
    uidev.id.vendor  = 0x2017;
    uidev.id.product = 0x0901;
    uidev.id.version = 1;

    if(write(uinputFd, &uidev, sizeof(uidev)) < 0) {
        LOGE("error: write : %s\n", strerror(errno));
    }

    if(ioctl(uinputFd, UI_DEV_CREATE) < 0) {
        LOGE("error: ioctl : %s\n", strerror(errno));
    }

    return uinputFd;
}

static void uinput_release(int uinputFd)
{
    CHECK_IF_FAIL(uinputFd > 0);

    if(ioctl(uinputFd, UI_DEV_DESTROY) < 0) {
        LOGE("error: ioctl : %s\n", strerror(errno));
    }
}

////////////////////////////////////////////////////////////////////////////////

static int shifting = FALSE;
static int ctrling = FALSE;
static int numberling = FALSE;
static int function = FALSE;

////////////////////////////////////////////////////////////////////////////////

static unsigned int X(void)
{
    return 0;
}

static unsigned int Y(void)
{
    return surface_height / ROW_COUNT / 10 / 2;
}

static void set_hex_color(cairo_t *cr, uint32_t color)
{
    cairo_set_source_rgba(cr,
        ((color >> 16) & 0xff) / 255.0,
        ((color >>  8) & 0xff) / 255.0,
        ((color >>  0) & 0xff) / 255.0,
        ((color >> 24) & 0xff) / 255.0);
}

static void draw_key(unsigned int color, const struct key *key, int x, int y, int w, int h, void *data)
{
    // LOGF("color=%08X, key=%s, x=%d, y=%d, w=%d, h=%d\n", color, key, x, y, w, h);

    const char *text = "";
    cairo_t *cr = (cairo_t*)data;

    // /* Paint frame */
    //if((ctrling) && !strcmp(key, "CTRL")) {
    if(key->code == KEY_F13) {
        text = numberling?key->upper:key->key;
    }
    else {
        text = shifting?key->upper:key->key;
    }

    if(key->code == pressing && key->shift == pressing_shift) {
        set_hex_color(cr, PRESSED_KEY_COLOR);
    }
    else {
        set_hex_color(cr, color);
    }

    cairo_rectangle(cr, x, y, w, h);
    cairo_set_line_width(cr, 3);
    cairo_stroke(cr);

    cairo_select_font_face(cr, "DroidSansMono", CAIRO_FONT_SLANT_NORMAL, CAIRO_FONT_WEIGHT_BOLD);
    cairo_set_font_size(cr, FONT_SIZE);

    cairo_move_to(cr, (x + 3) , (y + h * 2 / 3));

    cairo_show_text (cr, text);

    // cairo_restore(cr);
}

static void press_key(const struct key *key, int x, int y, int w, int h, void *data)
{
    struct display *d = (struct display*)data;

    if((x <= d->pointer_x && d->pointer_x <= (x + w))
    && (y <= d->pointer_y && d->pointer_y <= (y + h))) {
        LOGD("%s pressed\n", key->key);
        if(key->code == KEY_CLOSE) {
            running = FALSE;
        }
        else if(key->code == KEY_LEFTSHIFT) {
            shifting = shifting?FALSE:TRUE;
            changed = TRUE;
        }
        else if(key->code == KEY_F13) {
            numberling = numberling?FALSE:TRUE;
            shifting = FALSE;
            changed = TRUE;
        }
        else if(key->code == KEY_F14) {
            function = function?FALSE:TRUE;
            changed = TRUE;
        }
        else if(key->code == KEY_LEFTCTRL) {
            ctrling = TRUE;
            changed = TRUE;
            keyInput(uinput, KEY_LEFTCTRL, WL_KEYBOARD_KEY_STATE_PRESSED);
        }
        else {
            if(key->shift || shifting) {
                keyInput(uinput, KEY_LEFTSHIFT, WL_KEYBOARD_KEY_STATE_PRESSED);
            }

            keyInput(uinput, key->code, WL_KEYBOARD_KEY_STATE_PRESSED);
            usleep(1000);
            keyInput(uinput, key->code, WL_KEYBOARD_KEY_STATE_RELEASED);

            if(key->shift || shifting) {
                keyInput(uinput, KEY_LEFTSHIFT, WL_KEYBOARD_KEY_STATE_RELEASED);
            }

            if(ctrling) {
                ctrling = FALSE;
                changed = 1;
                keyInput(uinput, KEY_LEFTCTRL, WL_KEYBOARD_KEY_STATE_RELEASED);
            }
        }
        pressing = key->code;
        pressing_shift = key->shift;
    }
}

static void key_action(
    enum key_action action, unsigned int color,
    const struct key *key, int x, int y, int w, int h, void *data)
{
    switch(action) {
        case _KEY_ACTION_DRAW:
            draw_key(color, key, x, y, w, h, data);
        break;
        case _KEY_ACTION_PRESSED:
            press_key(key, x, y, w, h, data);
        break;
        default:
        break;
    }
}

static void funcKeyboard(enum key_action action, void * data)
{
    int k, x, y;

    int max1 = 9;
    int max2 = 9;

    if(function) {
        max1 = 7;
        max2 = 6;
    }

    int keySpaceWidth = (surface_width / max1) / max1;
    int keyWidth = (surface_width - keySpaceWidth * (max1 + 1)) / max1;

    x = X() + keySpaceWidth;
    y = Y() + surface_height / ROW_COUNT * 0;
    for(k=0;k<max1 + max2;k++) {

        if(k == max1) {
            x = X() + keySpaceWidth;
            y = Y() + surface_height / ROW_COUNT * 1;
        }

        if(function) {
            key_action(action,
                FUNC_COLOR,
                &keyboard_func2[k], x, y, keyWidth, keyHeight, data);
        }
        else {
            key_action(action,
                FUNC_COLOR,
                &keyboard_func1[k], x, y, keyWidth, keyHeight, data);
        }

        x += keyWidth + keySpaceWidth;
    }

}

static void letterKeyboard(enum key_action action, void * data)
{
    int i, k, x, y;

    int keySpaceWidth = (surface_width / 10) / 10;
    int keyWidth = (surface_width - keySpaceWidth * 11) / 10;
    int funcWidth = (surface_width - keyWidth * 7 - keySpaceWidth * 10) / 2;
    int spaceWidth = (surface_width - funcWidth * 2 - keySpaceWidth * 4);

    funcKeyboard(action, data);

    x = X() + keySpaceWidth;
    y = Y() + surface_height / ROW_COUNT * 2;
    for(i=0, k=0;i<10;i++,k++) {

        key_action(action,
            KEY_COLOR,
            &keyboard_map1[i], x, y, keyWidth, keyHeight, data);

        x += keyWidth + keySpaceWidth;
    }

    x = X() + (surface_width - keyWidth * 9 - keySpaceWidth * 10) / 2;
    y = Y() + surface_height / ROW_COUNT * 3;
    for(i=0;i<9;i++,k++) {

        key_action(action,
            KEY_COLOR,
            &keyboard_map2[i], x, y, keyWidth, keyHeight, data);

        x += keyWidth + keySpaceWidth;
    }

    x = X() + keySpaceWidth;
    y = Y() + surface_height / ROW_COUNT * 4;
    key_action(action,
        KEY_COLOR,
        &keyboard_func[0], x, y, funcWidth, keyHeight, data);

    x += funcWidth + keySpaceWidth;
    for(i=0;i<7;i++,k++) {

        key_action(action,
            KEY_COLOR,
            &keyboard_map3[i], x, y, keyWidth, keyHeight, data);

        x += keyWidth + keySpaceWidth;
    }
    key_action(action,
        KEY_COLOR,
        &keyboard_func[3], x, y, funcWidth, keyHeight, data);

    x = X() + keySpaceWidth;
    y = Y() + surface_height / ROW_COUNT * 5;
    key_action(action,
        KEY_COLOR,
        &keyboard_func[1], x, y, funcWidth, keyHeight, data);

    x += funcWidth + keySpaceWidth;
    key_action(action,
        KEY_COLOR,
        &keyboard_func[2], x, y, spaceWidth, keyHeight, data);

    x += spaceWidth + keySpaceWidth;
    key_action(action,
        KEY_COLOR,
        &keyboard_func[4], x, y, funcWidth, keyHeight, data);
}

static void symbolKeyboard(enum key_action action, void * data)
{
    int k, j, x, y;

    int keySpaceWidth = (surface_width / 12) / 10;
    int keyWidth = (surface_width - keySpaceWidth * 13) / 12;

    int funcWidth = (keyWidth);
    int spaceWidth = (keyWidth * 2 + keySpaceWidth);

    funcKeyboard(action, data);

    k = 0;
    int maxs[] ={12, 12, 10, 8}, max = 0;
    for(j=0;j<4;j++) {
        x = X() + keySpaceWidth;
        y = Y() + surface_height / ROW_COUNT * (j + 2);

        if(j == 3) {
            x = X() + keySpaceWidth * 3 + funcWidth + spaceWidth;
        }

        for(k=0;k<maxs[j];k++) {
            key_action(action,
                KEY_COLOR,
                &keyboard_map[k + max], x, y, keyWidth, keyHeight, data);

            x += keyWidth + keySpaceWidth;
        }

        max += maxs[j];
    }

    x = X() + (keySpaceWidth + keyWidth) * 10 + keySpaceWidth;
    y = Y() + surface_height / ROW_COUNT * 4;
    key_action(action,
        KEY_COLOR,
        &keyboard_func[3], x, y, keyWidth * 2 + keySpaceWidth, keyHeight, data);

    x = X() + keySpaceWidth;
    y = Y() + surface_height / ROW_COUNT * 5;
    key_action(action,
        KEY_COLOR,
        &keyboard_func[1], x, y, funcWidth, keyHeight, data);

    x += funcWidth + keySpaceWidth;
    key_action(action,
        KEY_COLOR,
        &keyboard_func[2], x, y, spaceWidth, keyHeight, data);

    x += keySpaceWidth + spaceWidth + (keySpaceWidth + keyWidth) * 8;
    key_action(action,
        KEY_COLOR,
        &keyboard_func[4], x, y, funcWidth, keyHeight, data);
}
```
