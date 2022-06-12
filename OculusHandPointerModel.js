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
