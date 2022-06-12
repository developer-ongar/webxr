import * as THREE from '../libs/three.module.js';

const PINCH_MAX = 0.05;
const PINCH_THRESHOLD = 0.02;
const PINCH_MIN = 0.01;
const POINTER_ADVANCE_MAX = 0.02;
const POINTER_OPACITY_MAX = 1;
const POINTER_OPACITY_MIN = 0.4;
const POINTER_FRONT_RADIUS = 0.002;
const POINTER_REAR_RADIUS = 0.01;
const POINTER_REAR_RADIUS_MIN = 0.003;
const POINTER_LENGTH = 0.035;
const POINTER_SEGMENTS = 16;
const POINTER_RINGS = 12;
const POINTER_HEMISPHERE_ANGLE = 110;
const YAXIS = new THREE.Vector3( 0, 1, 0 );
const ZAXIS = new THREE.Vector3( 0, 0, 1 );

const CURSOR_RADIUS = 0.02;
const CURSOR_MAX_DISTANCE = 1.5;

class OculusHandPointerModel extends THREE.Object3D {

	constructor( hand, controller ) {

		super();

		this.hand = hand;
		this.controller = controller;
		this.motionController = null;
		this.envMap = null;

		this.mesh = null;

		this.pointerGeometry = null;
		this.pointerMesh = null;
		this.pointerObject = null;

		this.pinched = false;
		this.attached = false;

		this.cursorObject = null;

		this.raycaster = null;

		hand.addEventListener( 'connected', ( event ) => {

			const xrInputSource = event.data;
			if ( xrInputSource.hand ) {

				this.visible = true;
				this.xrInputSource = xrInputSource;

				this.createPointer();

			}

		} );

	}
	
	_drawVerticesRing( vertices, baseVector, ringIndex ) {

		const segmentVector = baseVector.clone();
		for ( var i = 0; i < POINTER_SEGMENTS; i ++ ) {

			segmentVector.applyAxisAngle( ZAXIS, ( Math.PI * 2 ) / POINTER_SEGMENTS );
			const vid = ringIndex * POINTER_SEGMENTS + i;
			vertices[ 3 * vid ] = segmentVector.x;
			vertices[ 3 * vid + 1 ] = segmentVector.y;
			vertices[ 3 * vid + 2 ] = segmentVector.z;

		}

	}
	
	_updatePointerVertices( rearRadius ) {

		const vertices = this.pointerGeometry.attributes.position.array;
		// first ring for front face
		const frontFaceBase = new THREE.Vector3(
			POINTER_FRONT_RADIUS,
			0,
			- 1 * ( POINTER_LENGTH - rearRadius )
		);
		this._drawVerticesRing( vertices, frontFaceBase, 0 );

		// rings for rear hemisphere
		const rearBase = new THREE.Vector3(
			Math.sin( ( Math.PI * POINTER_HEMISPHERE_ANGLE ) / 180 ) * rearRadius,
			Math.cos( ( Math.PI * POINTER_HEMISPHERE_ANGLE ) / 180 ) * rearRadius,
			0
		);
		for ( var i = 0; i < POINTER_RINGS; i ++ ) {

			this._drawVerticesRing( vertices, rearBase, i + 1 );
			rearBase.applyAxisAngle(
				YAXIS,
				( Math.PI * POINTER_HEMISPHERE_ANGLE ) / 180 / ( POINTER_RINGS * - 2 )
			);

		}
		
		// front and rear face center vertices
		const frontCenterIndex = POINTER_SEGMENTS * ( 1 + POINTER_RINGS );
		const rearCenterIndex = POINTER_SEGMENTS * ( 1 + POINTER_RINGS ) + 1;
		const frontCenter = new THREE.Vector3(
			0,
			0,
			- 1 * ( POINTER_LENGTH - rearRadius )
		);
		vertices[ frontCenterIndex * 3 ] = frontCenter.x;
		vertices[ frontCenterIndex * 3 + 1 ] = frontCenter.y;
		vertices[ frontCenterIndex * 3 + 2 ] = frontCenter.z;
		const rearCenter = new THREE.Vector3( 0, 0, rearRadius );
		vertices[ rearCenterIndex * 3 ] = rearCenter.x;
		vertices[ rearCenterIndex * 3 + 1 ] = rearCenter.y;
		vertices[ rearCenterIndex * 3 + 2 ] = rearCenter.z;

		this.pointerGeometry.setAttribute(
			'position',
			new THREE.Float32BufferAttribute( vertices, 3 )
		);
		// verticesNeedUpdate = true;

	}
	
	createPointer() {

		var i, j;
		const vertices = new Array(
			( ( POINTER_RINGS + 1 ) * POINTER_SEGMENTS + 2 ) * 3
		).fill( 0 );
		// const vertices = [];
		const indices = [];
		this.pointerGeometry = new THREE.BufferGeometry();

		this.pointerGeometry.setAttribute(
			'position',
			new THREE.Float32BufferAttribute( vertices, 3 )
		);

		this._updatePointerVertices( POINTER_REAR_RADIUS );

		// construct faces to connect rings
		for ( i = 0; i < POINTER_RINGS; i ++ ) {

			for ( j = 0; j < POINTER_SEGMENTS - 1; j ++ ) {

				indices.push(
					i * POINTER_SEGMENTS + j,
					i * POINTER_SEGMENTS + j + 1,
					( i + 1 ) * POINTER_SEGMENTS + j
				);
				indices.push(
					i * POINTER_SEGMENTS + j + 1,
					( i + 1 ) * POINTER_SEGMENTS + j + 1,
					( i + 1 ) * POINTER_SEGMENTS + j
				);

			}

			indices.push(
				( i + 1 ) * POINTER_SEGMENTS - 1,
				i * POINTER_SEGMENTS,
				( i + 2 ) * POINTER_SEGMENTS - 1
			);
			indices.push(
				i * POINTER_SEGMENTS,
				( i + 1 ) * POINTER_SEGMENTS,
				( i + 2 ) * POINTER_SEGMENTS - 1
			);

		}
