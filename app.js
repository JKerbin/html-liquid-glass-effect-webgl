const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl');

if (!gl) {
    alert('WebGL not supported!');
    throw new Error('WebGL not supported');
}

// --- Control Inputs ---
const glassWidthSlider = document.getElementById('glassWidth');
const glassHeightSlider = document.getElementById('glassHeight');
const cornerRadiusSlider = document.getElementById('cornerRadius');
const iorSlider = document.getElementById('ior');
const imageUpload = document.getElementById('imageUpload');
const glassThicknessSlider = document.getElementById('glassThickness');
const normalStrengthSlider = document.getElementById('normalStrength');
const displacementScaleSlider = document.getElementById('displacementScale');
const heightBlurFactorSlider = document.getElementById('heightBlurFactor');
const sminSmoothingSlider = document.getElementById('sminSmoothing'); // New slider
const showNormalsCheckbox = document.getElementById('showNormalsCheckbox');
const blurRadiusSlider = document.getElementById('blurRadius'); // New slider
const highlightWidthSlider = document.getElementById('highlightWidth'); // New slider

const widthValueSpan = document.getElementById('widthValue');
const heightValueSpan = document.getElementById('heightValue');
const radiusValueSpan = document.getElementById('radiusValue');
const iorValueSpan = document.getElementById('iorValue');
const thicknessValueSpan = document.getElementById('thicknessValue');
const normalStrengthValueSpan = document.getElementById('normalStrengthValue');
const displacementScaleValueSpan = document.getElementById('displacementScaleValue');
const heightBlurFactorValueSpan = document.getElementById('heightBlurFactorValue');
const sminSmoothingValueSpan = document.getElementById('sminSmoothingValue'); // New span
const blurRadiusValueSpan = document.getElementById('blurRadiusValue'); // New span
const highlightWidthValueSpan = document.getElementById('highlightWidthValue'); // New span

let glassWidth = parseFloat(glassWidthSlider.value);
let glassHeight = parseFloat(glassHeightSlider.value);
let cornerRadius = parseFloat(cornerRadiusSlider.value);
let ior = parseFloat(iorSlider.value);
let glassThickness = parseFloat(glassThicknessSlider.value);
let normalStrength = parseFloat(normalStrengthSlider.value);
let displacementScale = parseFloat(displacementScaleSlider.value);
let heightBlurFactor = parseFloat(heightBlurFactorSlider.value);
let sminSmoothing = parseFloat(sminSmoothingSlider.value); // New variable
let blurRadius = parseFloat(blurRadiusSlider.value); // New variable
let highlightWidth = parseFloat(highlightWidthSlider.value); // New variable
let showNormals = showNormalsCheckbox.checked;

glassWidthSlider.oninput = () => { glassWidth = parseFloat(glassWidthSlider.value); widthValueSpan.textContent = glassWidth; };
glassHeightSlider.oninput = () => { glassHeight = parseFloat(glassHeightSlider.value); heightValueSpan.textContent = glassHeight; };
cornerRadiusSlider.oninput = () => { cornerRadius = parseFloat(cornerRadiusSlider.value); radiusValueSpan.textContent = cornerRadius; };
iorSlider.oninput = () => { ior = parseFloat(iorSlider.value); iorValueSpan.textContent = ior; };
glassThicknessSlider.oninput = () => { glassThickness = parseFloat(glassThicknessSlider.value); thicknessValueSpan.textContent = glassThickness;};
normalStrengthSlider.oninput = () => { normalStrength = parseFloat(normalStrengthSlider.value); normalStrengthValueSpan.textContent = normalStrength; };
displacementScaleSlider.oninput = () => { displacementScale = parseFloat(displacementScaleSlider.value); displacementScaleValueSpan.textContent = displacementScale; };
heightBlurFactorSlider.oninput = () => { heightBlurFactor = parseFloat(heightBlurFactorSlider.value); heightBlurFactorValueSpan.textContent = heightBlurFactor; };
sminSmoothingSlider.oninput = () => { sminSmoothing = parseFloat(sminSmoothingSlider.value); sminSmoothingValueSpan.textContent = sminSmoothing; }; // New handler
blurRadiusSlider.oninput = () => { blurRadius = parseFloat(blurRadiusSlider.value); blurRadiusValueSpan.textContent = blurRadius; }; // New handler
highlightWidthSlider.oninput = () => { highlightWidth = parseFloat(highlightWidthSlider.value); highlightWidthValueSpan.textContent = highlightWidth; }; // New handler
showNormalsCheckbox.onchange = () => { showNormals = showNormalsCheckbox.checked; };


// --- Mouse Position ---
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

let isDragging = false; // New: Flag to track if the glass is being dragged

canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) { // Left mouse button
        isDragging = true;
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

canvas.addEventListener('mouseleave', () => {
    isDragging = false; // Stop dragging if mouse leaves the canvas
});

canvas.addEventListener('mousemove', (event) => {
    if (isDragging) {
        mouseX = event.clientX;
        mouseY = event.clientY;
    }
});

// --- Shaders ---
const vsSource = `
    precision mediump float;
    attribute vec2 a_position; // Quad vertices (-0.5 to 0.5)

    uniform vec2 u_resolution;
    uniform vec2 u_mousePos;   // Center of glass in pixels
    uniform vec2 u_glassSize;  // Size of glass in pixels

    varying vec2 v_screenTexCoord; // Texture coordinate for background sampling (0-1 screen space)
    varying vec2 v_shapeCoord;     // Coordinate relative to glass center, normalized (-0.5 to 0.5)

    void main() {
        vec2 screenPos = u_mousePos + a_position * u_glassSize;
        vec2 clipSpacePos = (screenPos / u_resolution) * 2.0 - 1.0;
        gl_Position = vec4(clipSpacePos * vec2(1.0, -1.0), 0.0, 1.0);
        v_screenTexCoord = screenPos / u_resolution;
        v_screenTexCoord.y = 1.0 - v_screenTexCoord.y;
        v_shapeCoord = a_position;
    }
`;

const fsSource = `
    precision mediump float;

    uniform sampler2D u_backgroundTexture;
    uniform vec2 u_resolution;
    uniform vec2 u_glassSize;
    uniform float u_cornerRadius;
    uniform float u_ior;
    uniform float u_glassThickness;
    uniform float u_normalStrength;
    uniform float u_displacementScale;
    uniform float u_heightTransitionWidth; // Renamed from u_heightBlurFactor for clarity
    uniform float u_sminSmoothing;     // New: SDF smoothing factor k
    uniform int u_showNormals;
    uniform float u_blurRadius;        // New: Blur radius for frosted glass effect
    uniform vec4 u_overlayColor;       // New: Overlay color for the glass (e.g., subtle white)
    uniform float u_highlightWidth;    // New: Width of the white highlight at the edge

    varying vec2 v_screenTexCoord;
    varying vec2 v_shapeCoord;

    // Polynomial smooth min (quartic)
    // k controls the smoothness/radius of the blend
    float smin_polynomial(float a, float b, float k) {
        if (k <= 0.0) return min(a, b); // Avoid division by zero or no smoothing
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(b, a, h) - k * h * (1.0 - h);
    }

    // Polynomial smooth max
    float smax_polynomial(float a, float b, float k) {
        if (k <= 0.0) return max(a, b);
        // return -smin_polynomial(-a, -b, k); // Alternative formulation
        float h = clamp(0.5 + 0.5 * (a - b) / k, 0.0, 1.0);
        return mix(b, a, h) + k * h * (1.0 - h); // Note: +k and (a-b)
    }

    // Original sdRoundedBox (for reference or if k_smooth is 0)
    float sdRoundedBoxSharp(vec2 p, vec2 b, float r) {
        vec2 q = abs(p) - b + r;
        return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
    }

    // Smoothed sdRoundedBox using polynomial smin/smax
    float sdRoundedBoxSmooth(vec2 p, vec2 b, float r, float k_smooth) {
        if (k_smooth <= 0.0) { // Fallback to sharp if no smoothing
            return sdRoundedBoxSharp(p,b,r);
        }
        vec2 q = abs(p) - b + r;

        // Term A: max(q.x, q.y) - This is a key part for corner definition
        float termA_smooth = smax_polynomial(q.x, q.y, k_smooth);

        // Term B: min(termA_smooth, 0.0) - Clamps the distance for points along straight edges
        // Smoothing this min( , 0.0) can be tricky. Using a smaller k or no smoothing might be safer.
        // Let's try with a potentially smaller k for this specific part.
        float termB_smooth = smin_polynomial(termA_smooth, 0.0, k_smooth * 0.5); 

        // Term C: length(max(q, 0.0)) - Distance from corner center for points in corner region
        // max(q, 0.0) is vec2(max(q.x, 0.0), max(q.y, 0.0))
        vec2 q_for_length_smooth = vec2(
            smax_polynomial(q.x, 0.0, k_smooth),
            smax_polynomial(q.y, 0.0, k_smooth)
        );
        float termC_smooth = length(q_for_length_smooth);
        
        return termB_smooth + termC_smooth - r;
    }

    // Helper function to convert SDF to height
    float getHeightFromSDF(vec2 p_pixel_space, vec2 b_pixel_space, float r_pixel, float k_s, float transition_w) {
        float dist_sample = sdRoundedBoxSmooth(p_pixel_space, b_pixel_space, r_pixel, k_s);
        // Normalize dist_sample to [-1, 1] within the transition band
        float normalized_dist = dist_sample / transition_w;
        
        // Use a logistic sigmoid function for a steep drop at the edge (normalized_dist=0) and flatten out
        // A higher steepness_factor leads to a sharper transition
        const float steepness_factor = 6.0; // This value can be tuned
        float height = 1.0 - (1.0 / (1.0 + exp(-normalized_dist * steepness_factor)));
        
        // Clamp to [0, 1] to ensure it stays within valid height range
        return clamp(height, 0.0, 1.0);
    }

    void main() {
        float actualCornerRadius = min(u_cornerRadius, min(u_glassSize.x, u_glassSize.y) / 2.0);
        
        // Current point in pixel space relative to glass center
        vec2 current_p_pixel = v_shapeCoord * u_glassSize;
        vec2 glass_half_size_pixel = u_glassSize / 2.0;

        // Initial SDF check for discard (can use sharp version for efficiency if k_smooth is large)
        float dist_for_shape_boundary = sdRoundedBoxSmooth(current_p_pixel, glass_half_size_pixel, actualCornerRadius, u_sminSmoothing);
        if (dist_for_shape_boundary > 0.001) { // Discard if clearly outside transition band
            discard;
        }


        vec2 pixel_step_in_norm_space = vec2(1.0 / u_glassSize.x, 1.0 / u_glassSize.y); // Step in v_shapeCoord's space

        // Sampling steps in normalized shape space (v_shapeCoord space)
        float norm_step_x1 = pixel_step_in_norm_space.x * 0.75;
        float norm_step_y1 = pixel_step_in_norm_space.y * 0.75;
        float norm_step_x2 = pixel_step_in_norm_space.x * 1.5;
        float norm_step_y2 = pixel_step_in_norm_space.y * 1.5;

        // Calculate X direction gradient
        // getHeightFromSDF expects pixel space coords for p, b, r, k_s, transition_w
        float h_px1 = getHeightFromSDF((v_shapeCoord + vec2(norm_step_x1, 0.0)) * u_glassSize, glass_half_size_pixel, actualCornerRadius, u_sminSmoothing, u_heightTransitionWidth);
        float h_nx1 = getHeightFromSDF((v_shapeCoord - vec2(norm_step_x1, 0.0)) * u_glassSize, glass_half_size_pixel, actualCornerRadius, u_sminSmoothing, u_heightTransitionWidth);
        float h_px2 = getHeightFromSDF((v_shapeCoord + vec2(norm_step_x2, 0.0)) * u_glassSize, glass_half_size_pixel, actualCornerRadius, u_sminSmoothing, u_heightTransitionWidth);
        float h_nx2 = getHeightFromSDF((v_shapeCoord - vec2(norm_step_x2, 0.0)) * u_glassSize, glass_half_size_pixel, actualCornerRadius, u_sminSmoothing, u_heightTransitionWidth);

        // Denominators are distances in pixels
        float grad_x1 = (h_px1 - h_nx1) / (2.0 * norm_step_x1 * u_glassSize.x);
        float grad_x2 = (h_px2 - h_nx2) / (2.0 * norm_step_x2 * u_glassSize.x);
        float delta_x = mix(grad_x1, grad_x2, 0.5);

        // Calculate Y direction gradient
        float h_py1 = getHeightFromSDF((v_shapeCoord + vec2(0.0, norm_step_y1)) * u_glassSize, glass_half_size_pixel, actualCornerRadius, u_sminSmoothing, u_heightTransitionWidth);
        float h_ny1 = getHeightFromSDF((v_shapeCoord - vec2(0.0, norm_step_y1)) * u_glassSize, glass_half_size_pixel, actualCornerRadius, u_sminSmoothing, u_heightTransitionWidth);
        float h_py2 = getHeightFromSDF((v_shapeCoord + vec2(0.0, norm_step_y2)) * u_glassSize, glass_half_size_pixel, actualCornerRadius, u_sminSmoothing, u_heightTransitionWidth);
        float h_ny2 = getHeightFromSDF((v_shapeCoord - vec2(0.0, norm_step_y2)) * u_glassSize, glass_half_size_pixel, actualCornerRadius, u_sminSmoothing, u_heightTransitionWidth);
        
        float grad_y1 = (h_py1 - h_ny1) / (2.0 * norm_step_y1 * u_glassSize.y);
        float grad_y2 = (h_py2 - h_ny2) / (2.0 * norm_step_y2 * u_glassSize.y);
        float delta_y = mix(grad_y1, grad_y2, 0.5);

        vec3 surfaceNormal3D = normalize(vec3(-delta_x * u_normalStrength, -delta_y * u_normalStrength, 1.0));

        if (u_showNormals == 1) {
            gl_FragColor = vec4(surfaceNormal3D * 0.5 + 0.5, 1.0); // Remap from [-1,1] to [0,1] for color
            return;
        }

        vec3 incidentLightDir = normalize(vec3(0.0, 0.0, -1.0));
        vec3 refractedIntoGlass = refract(incidentLightDir, surfaceNormal3D, 1.0 / u_ior);
        vec3 refractedOutOfGlass = refract(refractedIntoGlass, -surfaceNormal3D, u_ior);

        vec2 offset_in_pixels = refractedOutOfGlass.xy * u_glassThickness;
        vec2 offset = (offset_in_pixels / u_resolution) * u_displacementScale;

        vec2 refractedTexCoord = v_screenTexCoord + offset;
        refractedTexCoord = clamp(refractedTexCoord, 0.001, 0.999);

        // Frosted Glass Effect: Apply a 3x3 box blur to the refracted texture
        vec4 blurredColor = vec4(0.0);
        vec2 texelSize = 1.0 / u_resolution; // Size of one pixel in texture coordinates
        float blurPixelRadius = u_blurRadius; 

        // Unrolled 3x3 blur samples
        blurredColor += texture2D(u_backgroundTexture, refractedTexCoord + vec2(-1.0, -1.0) * blurPixelRadius * texelSize);
        blurredColor += texture2D(u_backgroundTexture, refractedTexCoord + vec2( 0.0, -1.0) * blurPixelRadius * texelSize);
        blurredColor += texture2D(u_backgroundTexture, refractedTexCoord + vec2( 1.0, -1.0) * blurPixelRadius * texelSize);
        blurredColor += texture2D(u_backgroundTexture, refractedTexCoord + vec2(-1.0,  0.0) * blurPixelRadius * texelSize);
        blurredColor += texture2D(u_backgroundTexture, refractedTexCoord + vec2( 0.0,  0.0) * blurPixelRadius * texelSize); // Center sample
        blurredColor += texture2D(u_backgroundTexture, refractedTexCoord + vec2( 1.0,  0.0) * blurPixelRadius * texelSize);
        blurredColor += texture2D(u_backgroundTexture, refractedTexCoord + vec2(-1.0,  1.0) * blurPixelRadius * texelSize);
        blurredColor += texture2D(u_backgroundTexture, refractedTexCoord + vec2( 0.0,  1.0) * blurPixelRadius * texelSize);
        blurredColor += texture2D(u_backgroundTexture, refractedTexCoord + vec2( 1.0,  1.0) * blurPixelRadius * texelSize);
        
        blurredColor /= 9.0; // Divide by total number of samples (3x3 = 9)

        // Mix with an overlay color to make the glass stand out more
        // The height value here can be used as an alpha or blending factor if desired
        // For a subtle overlay, we can just mix with a fixed alpha
        float height_val = getHeightFromSDF(current_p_pixel, glass_half_size_pixel, actualCornerRadius, u_sminSmoothing, u_heightTransitionWidth);
        vec4 finalColor = mix(blurredColor, u_overlayColor, height_val * 0.15); // Adjust 0.15 for desired opacity
        
        // Apply highlight on top of the final color
        float highlight_dist = abs(dist_for_shape_boundary);
        // The highlight will be strongest at highlight_dist = 0.0 and fade out towards u_highlightWidth
        float highlight_alpha = 1.0 - smoothstep(0.0, u_highlightWidth, highlight_dist);
        highlight_alpha = max(0.0, highlight_alpha); // Ensure it's not negative

        // Directional highlight based on normal
        // We want highlight stronger when surfaceNormal3D.x and surfaceNormal3D.y have the same sign
        // This corresponds to normals pointing towards top-left (-x, -y) or bottom-right (+x, +y) edges
        float directionalFactor = (surfaceNormal3D.x * surfaceNormal3D.y + 1.0) * 0.5; // Scales from 0 to 1
        // You can add a boost to this factor if the highlight is too subtle
        // directionalFactor = pow(directionalFactor, 0.5); // Example: apply power for non-linear control
        
        float finalHighlightAlpha = highlight_alpha * directionalFactor;
        
        gl_FragColor = mix(finalColor, vec4(1.0, 1.0, 1.0, 1.0), finalHighlightAlpha);
    }
`;

// --- Background Shaders (Unchanged) ---
const bgVsSource = `
    attribute vec2 a_position;
    varying vec2 v_texCoord;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = (a_position + 1.0) / 2.0;
    }
`;
const bgFsSource = `
    precision mediump float;
    uniform sampler2D u_backgroundTexture;
    varying vec2 v_texCoord;
    void main() {
        gl_FragColor = texture2D(u_backgroundTexture, v_texCoord);
    }
`;

// --- WebGL Setup ---
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(`Shader compile error (${type === gl.VERTEX_SHADER ? 'VS' : 'FS'}):`, gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    throw new Error('Program link error');
}

const bgVertexShader = createShader(gl, gl.VERTEX_SHADER, bgVsSource);
const bgFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, bgFsSource);
const bgProgram = gl.createProgram();
gl.attachShader(bgProgram, bgVertexShader);
gl.attachShader(bgProgram, bgFragmentShader);
gl.linkProgram(bgProgram);
if (!gl.getProgramParameter(bgProgram, gl.LINK_STATUS)) {
    console.error('Background Program link error:', gl.getProgramInfoLog(bgProgram));
    throw new Error('Background Program link error');
}

// --- Attribute and Uniform Locations ---
const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
const mousePosUniformLocation = gl.getUniformLocation(program, 'u_mousePos');
const glassSizeUniformLocation = gl.getUniformLocation(program, 'u_glassSize');
const backgroundTextureUniformLocation = gl.getUniformLocation(program, 'u_backgroundTexture');
const cornerRadiusUniformLocation = gl.getUniformLocation(program, 'u_cornerRadius');
const iorUniformLocation = gl.getUniformLocation(program, 'u_ior');
const glassThicknessUniformLocation = gl.getUniformLocation(program, 'u_glassThickness');
const normalStrengthUniformLocation = gl.getUniformLocation(program, 'u_normalStrength');
const displacementScaleUniformLocation = gl.getUniformLocation(program, 'u_displacementScale');
const heightTransitionWidthUniformLocation = gl.getUniformLocation(program, 'u_heightTransitionWidth'); // Renamed
const sminSmoothingUniformLocation = gl.getUniformLocation(program, 'u_sminSmoothing'); // New
const showNormalsUniformLocation = gl.getUniformLocation(program, 'u_showNormals');
const blurRadiusUniformLocation = gl.getUniformLocation(program, 'u_blurRadius'); // New
const overlayColorUniformLocation = gl.getUniformLocation(program, 'u_overlayColor'); // New
const highlightWidthUniformLocation = gl.getUniformLocation(program, 'u_highlightWidth'); // New

const bgPositionAttributeLocation = gl.getAttribLocation(bgProgram, 'a_position');
const bgBackgroundTextureUniformLocation = gl.getUniformLocation(bgProgram, 'u_backgroundTexture');

// --- Geometry ---
const positions = [ -0.5,-0.5, 0.5,-0.5, -0.5,0.5, -0.5,0.5, 0.5,-0.5, 0.5,0.5 ];
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

const bgPositions = [ -1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1 ];
const bgPositionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, bgPositionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bgPositions), gl.STATIC_DRAW);

// --- Texture ---
let backgroundTextureGL = gl.createTexture(); // Renamed to avoid conflict
gl.bindTexture(gl.TEXTURE_2D, backgroundTextureGL);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

function loadTexture(url) {
    const image = new Image();
    image.crossOrigin = "anonymous"; // For picsum or other CORS images
    image.src = url;
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, backgroundTextureGL);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
           gl.generateMipmap(gl.TEXTURE_2D);
        } else {
           gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
           gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
           gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    };
    image.onerror = () => { console.error("Failed to load image:", url); }
}

function isPowerOf2(value) { return (value & (value - 1)) === 0; }

imageUpload.onchange = (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => { loadTexture(e.target.result); }
        reader.readAsDataURL(file);
    }
};
loadTexture('https://picsum.photos/1920/1080?random=' + Math.floor(Math.random()*100));


// --- Render Loop ---
function render() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clearColor(0.1, 0.1, 0.1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // --- Draw Background ---
    gl.useProgram(bgProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, bgPositionBuffer);
    gl.enableVertexAttribArray(bgPositionAttributeLocation);
    gl.vertexAttribPointer(bgPositionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, backgroundTextureGL);
    gl.uniform1i(bgBackgroundTextureUniformLocation, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // --- Draw Glass ---
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
    gl.uniform2f(mousePosUniformLocation, mouseX, mouseY);
    gl.uniform2f(glassSizeUniformLocation, glassWidth, glassHeight);
    gl.uniform1f(cornerRadiusUniformLocation, cornerRadius);
    gl.uniform1f(iorUniformLocation, ior);
    gl.uniform1f(glassThicknessUniformLocation, glassThickness);
    gl.uniform1f(normalStrengthUniformLocation, normalStrength);
    gl.uniform1f(displacementScaleUniformLocation, displacementScale);
    gl.uniform1f(heightTransitionWidthUniformLocation, heightBlurFactor); // heightBlurFactor now directly controls pixel width
    gl.uniform1f(sminSmoothingUniformLocation, sminSmoothing); // New
    gl.uniform1i(showNormalsUniformLocation, showNormals ? 1 : 0);
    gl.uniform1f(blurRadiusUniformLocation, blurRadius); // New
    gl.uniform4f(overlayColorUniformLocation, 1.0, 1.0, 1.0, 1.0); // White color for overlay
    gl.uniform1f(highlightWidthUniformLocation, highlightWidth); // New

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, backgroundTextureGL);
    gl.uniform1i(backgroundTextureUniformLocation, 0);

    // Enable blending for a nicer glass effect if desired
    // gl.enable(gl.BLEND);
    // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    // gl.disable(gl.BLEND);


    requestAnimationFrame(render);
}

render();