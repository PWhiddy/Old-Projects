
function ShaderSource ( dimensions, axisCount ) {

	this.dimension = dimensions;
	this.axisCount = axisCount;

	this.vertexAttrib = function vertexAttrib () {

		var source = [

			'uniform float nPlaneDistance;',
		//	'uniform int rotationAxis;',
			('uniform float scale[' + this.dimension + '];'),
			'uniform float rotMultiplier;',
			'uniform float slideWidth;',
			('uniform float rotations[' + this.axisCount + '];'),
			'uniform mat4 modelViewMatrix;',
			'uniform mat4 projectionMatrix;',
		//	'uniform vec3 offset;',
		//	'const float rotationSize = 0.5;',

			'attribute vec3 position;',
			'attribute vec3 normal;',
			'attribute vec3 offset;',
			'attribute float size;',
		//	'attribute float rotationSize;',
			'attribute float rotAxis;',
			'attribute float gOff;',
			this.makePositionAttributes(),

			'varying vec3 possy;',
			'varying float displacement;',
			'varying float column;',
			'varying float rotAx;',

			'const float pi = 3.1415926;',

			'void main() {',

				'float axisValues[' + this.dimension + '];',
				this.populatePositionArray(),
				
			//	('for (int i = 0; i < ' + this.dimension + '; i++) {'),
			//		'axisValues[i] *= size;',
			//	'}',

				'int rotationAxis = int(rotAxis);',
				
				'int r = 0;',
				'float rotationOffset;',
				'if (rotationAxis > -1) {',
					'rotationOffset = offset.y - rotations[rotationAxis];',
					('for (int a = 0; a < ' + (this.dimension - 1) + '; a++) {'),
						('for (int b = 1; b < ' + this.dimension + '; b++) {'),
							'if (a >= b || r > rotationAxis) {',
								'continue;',
							'}',
							'if (r == rotationAxis) {',
								'float s = sin(rotationOffset * rotMultiplier);',
								'float c = cos(rotationOffset * rotMultiplier);',
								'float oldA = axisValues[a];',
	 							'float oldB = axisValues[b];',
								'axisValues[a] = oldA * c - oldB * s;',
								'axisValues[b] = oldA * s + oldB * c;',
							'}',
							'r++;',
						'}',
					'}',
				'} else {',
					'rotationOffset = offset.y;',
				'}',

				'displacement = rotationOffset * 1.0;',
				
				'float squashFactor = 1.0 / pow(nPlaneDistance,', 
					('float(' + this.dimension + ') - 3.0);'),
				
				('for (int axis = 3; axis < ' + this.dimension + '; axis++) {'),
					'squashFactor *= axisValues[axis] + nPlaneDistance;',
				'}',
				'vec3 p = vec3( size * axisValues[0] / squashFactor +  1.8 * offset.x,',
		     				   'size * axisValues[1] / squashFactor +  2.5 * rotationOffset + 2.0 * gOff,',
		     		 		   'size * axisValues[2] / squashFactor +  offset.z);',
				
				'gl_PointSize = 6.0;',
				'vec4 spot = vec4(projectionMatrix *',
		    				   'modelViewMatrix *',
		     				   'vec4(p.xyz, 1.0));',
			//	'p = vec3();',
				'possy = p;',
				'column = offset.x/slideWidth + 3.5;',
				'rotAx = rotAxis;',
				'gl_Position =  vec4(spot);',
			'}'
		].join('\n');

		return source;

	}

	this.makePositionAttributes = function makePositionAttributes () {
		var result = '';
		for ( var axis = 1; axis <= this.dimension; axis++ ) {
			result += 'attribute float pos' + axis + ';\n';
		}
		return result;
	}

	this.populatePositionArray = function populatePositionArray () {
		var result = '';
		for ( var axis = 0; axis < this.dimension; axis++ ) {
			result += 'axisValues[' + axis + '] = pos' 
			+ (axis + 1) + ' * scale[' + axis + '];\n';
		}
		return result;
	}


	this.cubeFragFaces = function cubeFragFaces () {

		var source = [

			'#extension GL_OES_standard_derivatives : enable',
			'precision highp int;',
			'precision highp float;',

			'uniform float time;',
			'uniform float verticalSpace;',
			'uniform float slideHeight;',
			'uniform float sliderVCenter;',
			('uniform float scale[' + this.dimension + '];'),

			'varying vec3 possy;',
			'varying float displacement;',
			'varying float column;',
			'varying float rotAx;',
		

			'void main() {',

		//		'gl_FragColor = vec4( cos(time * 1.11) * sin(dProd * 3.0) , cos(time) , sin(time * 1.31) - dProd, 0.27);',
				'float alpha = min( (0.4 * slideHeight - abs(displacement)) / verticalSpace, 1.0);',
			//	'float alpha = min( 1.0 / (abs(sliderVCenter - possy.y) + 1.0), 1.0);',
				'float alpha2 = scale[1];',
				'if (column == 2.0 || column == 4.0 ) {',
					'alpha2 = scale[2];',
				'}',
				'if (column == 3.0 || column > 4.0 ) {',
						'alpha2 = scale[3];',
				'}',
				'if (rotAx==-1.0) alpha2 = 1.0;',	

				'vec3 fdx = vec3(dFdx(possy.x), dFdx(possy.y), dFdx(possy.z));',
				'vec3 fdy = vec3(dFdy(possy.x), dFdy(possy.y), dFdy(possy.z));',
				'vec3 norm = normalize(cross(fdx, fdy));',
				'vec3 lightAngle = normalize(possy - vec3(0.0, 0.0, -1.7));',
				'float dProd = 2.4 * pow(dot(norm, lightAngle), 6.0) + 0.35;',

				'gl_FragColor = vec4( dProd, 0.0, dProd, 0.3 * alpha * alpha2 );',
			'}'

		].join('\n');

		return source;

	}

	this.cubeFragEdges = function cubeFragEdges () {

		var source = [

			'precision highp int;',
			'precision highp float;',

			'uniform float time;',
			'uniform float verticalSpace;',
			'uniform float slideHeight;',
			('uniform float scale[' + this.dimension + '];'),

		//	'varying vec3 vNormal;',
			'varying float displacement;',
			'varying float column;',
			'varying float rotAx;',

			'void main() {',
			//	'vec3 lightAngle = normalize(vec3( 1.0 * sin(time), 0.8, 0.9));',
			//	'float dProd = max(0.0, dot(vNormal, lightAngle));',
			//	'gl_FragColor = vec4( cos(time * 1.11) * sin(dProd * 3.0) , cos(time) , sin(time * 1.31) - dProd, 0.27);',
				'float alpha = min( (0.4 * slideHeight - abs(displacement)) / ( 1.3 * verticalSpace), 1.0);',

				'float alpha2 = scale[1];',
				'if (column == 2.0 || column == 4.0 ) {',
					'alpha2 = scale[2];',
				'}',
				'if (column == 3.0 || column > 4.0 ) {',
						'alpha2 = scale[3];',
				'}',
				'if (rotAx==-1.0) alpha2 = 1.0;',	

				'gl_FragColor = vec4( 0.0, 1.0, 0.0, alpha * alpha2 );',
			'}'

		].join('\n');

		return source;

	}

	this.cubeFragPoints = function cubeFragPoints () {

		var source = [

			'precision highp int;',
			'precision highp float;',

			'uniform float time;',
			'uniform sampler2D texture;',
			'uniform float verticalSpace;',
			'uniform float slideHeight;',
			('uniform float scale[' + this.dimension + '];'),

	//		'varying vec3 vNormal;',
			'varying float displacement;',
			'varying float column;',
			'varying float rotAx;',

			'void main() {',
			//	'vec3 lightAngle = normalize(vec3( 1.0 * sin(time), 0.8, 0.9));',
			//	'float dProd = max(0.0, dot(vNormal, lightAngle));',
			//	'gl_FragColor = vec4( cos(time * 1.11) * sin(dProd * 3.0) , cos(time) , sin(time * 1.31) - dProd, 0.27);',
				'float alpha = min( (0.4 * slideHeight - abs(displacement)) / verticalSpace, 1.0);',

				'float alpha2 = scale[1];',
				'if (column == 2.0 || column == 4.0 ) {',
					'alpha2 = scale[2];',
				'}',
				'if (column == 3.0 || column > 4.0 ) {',
						'alpha2 = scale[3];',
				'}',
				'if (rotAx==-1.0) alpha2 = 1.0;',		

				'gl_FragColor = vec4( 0.0, 1.0, 0.0, texture2D( texture, gl_PointCoord).a * alpha * alpha2); ',
			'}'

		].join('\n');

		return source;

	}


}