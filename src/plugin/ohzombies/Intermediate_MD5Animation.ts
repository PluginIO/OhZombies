﻿///<reference path="../../../bin/libs/away3d-core-ts/Away3D.next.d.ts" />

module plugin.ohzombies
{
    import CrossfadeTransition                  = away.animators.CrossfadeTransition;
    import Skeleton                             = away.animators.Skeleton;
    import SkeletonAnimationSet                 = away.animators.SkeletonAnimationSet;
    import SkeletonAnimator                     = away.animators.SkeletonAnimator;
    import SkeletonClipNode                     = away.animators.SkeletonClipNode;
	import Camera3D                             = away.cameras.Camera3D;
	import ObjectContainer3D                    = away.containers.ObjectContainer3D;
    import Scene3D                              = away.containers.Scene3D;
    import View3D                               = away.containers.View3D;
	import LookAtController                     = away.controllers.LookAtController;
	import Mesh                                 = away.entities.Mesh;
    import SkyBox                               = away.entities.SkyBox;
    import Sprite3D                             = away.entities.Sprite3D;
	import AnimationStateEvent                  = away.events.AnimationStateEvent;
    import AssetEvent                           = away.events.AssetEvent;
    import LoaderEvent                          = away.events.LoaderEvent;
	import AssetLibrary                         = away.library.AssetLibrary;
	import AssetType                            = away.library.AssetType;
	import PointLight                           = away.lights.PointLight;
    import DirectionalLight                     = away.lights.DirectionalLight;
	import NearDirectionalShadowMapper          = away.lights.NearDirectionalShadowMapper;
	import MD5AnimParser                        = away.loaders.MD5AnimParser;
    import MD5MeshParser                        = away.loaders.MD5MeshParser;
    import FogMethod                            = away.materials.FogMethod;
	import StaticLightPicker                    = away.materials.StaticLightPicker;
    import TextureMaterial                      = away.materials.TextureMaterial;
    import SoftShadowMapMethod                  = away.materials.SoftShadowMapMethod;
    import NearShadowMapMethod                  = away.materials.NearShadowMapMethod;
    import URLRequest                           = away.net.URLRequest;
	import PlaneGeometry                        = away.primitives.PlaneGeometry;
	import HTMLImageElementCubeTexture          = away.textures.HTMLImageElementCubeTexture;
    import HTMLImageElementTexture              = away.textures.HTMLImageElementTexture;
    import Keyboard                             = away.ui.Keyboard;
	import Cast                                 = away.utils.Cast;
    import RequestAnimationFrame                = away.utils.RequestAnimationFrame;

	export class Intermediate_MD5Animation
	{
		//engine variables
		private scene:Scene3D;
		private camera:Camera3D;
		private view:View3D;
		private cameraController:LookAtController;

		//animation variables
		private animator:SkeletonAnimator;
		private animationSet:SkeletonAnimationSet;
		private stateTransition:CrossfadeTransition = new CrossfadeTransition(0.5);
		private skeleton:Skeleton;
		private isRunning:Boolean;
		private isMoving:Boolean;
		private movementDirection:number;
		private onceAnim:string;
		private currentAnim:string;
		private currentRotationInc:number = 0;

		//animation constants
        private static IDLE_NAME:string = "idle2";
        private static WALK_NAME:string = "walk7";
        private static ANIM_NAMES:Array<string> = new Array<string>(Intermediate_MD5Animation.IDLE_NAME, Intermediate_MD5Animation.WALK_NAME, "attack3", "turret_attack", "attack2", "chest", "roar1", "leftslash", "headpain", "pain1", "pain_luparm", "range_attack2");
        private static ROTATION_SPEED:number = 3;
        private static RUN_SPEED:number = 2;
        private static WALK_SPEED:number = 1;
        private static IDLE_SPEED:number = 1;
        private static ACTION_SPEED:number = 1;

		//light objects
		private redLight:PointLight;
		private blueLight:PointLight;
		private whiteLight:DirectionalLight;
		private lightPicker:StaticLightPicker;
		private shadowMapMethod:NearShadowMapMethod;
		private fogMethod:FogMethod;
		private count:number = 0;

		//material objects
		private redLightMaterial:TextureMaterial;
		private blueLightMaterial:TextureMaterial;
		private groundMaterial:TextureMaterial;
		private bodyMaterial:TextureMaterial;
        private gobMaterial:TextureMaterial;
		private cubeTexture:HTMLImageElementCubeTexture;

		//scene objects
		private placeHolder:ObjectContainer3D;
		private mesh:Mesh;
		private ground:Mesh;
		private skyBox:SkyBox;

        private _timer:RequestAnimationFrame;
        private _time:number = 0;

		/**
		 * Constructor
		 */
		constructor()
		{
			this.init();
		}

		/**
		 * Global initialise function
		 */
		private init():void
		{
			this.initEngine();
            //this.initText();
            this.initLights();
            this.initMaterials();
            this.initObjects();
            this.initListeners();
		}

		/**
		 * Initialise the engine
		 */
		private initEngine():void
		{
            this.view = new View3D();
            this.scene = this.view.scene;
            this.camera = this.view.camera;

            this.camera.lens.far = 5000;
            this.camera.z = -200;
            this.camera.y = 160;

			//setup controller to be used on the camera
            this.placeHolder = new ObjectContainer3D();
            this.placeHolder.y = 50;
            this.cameraController = new LookAtController(this.camera, this.placeHolder);
		}

		/**
		 * Create an instructions overlay
		 */
//		private initText():void
//		{
//			text = new TextField();
//			text.defaultTextFormat = new TextFormat("Verdana", 11, 0xFFFFFF);
//			text.width = 240;
//			text.height = 100;
//			text.selectable = false;
//			text.mouseEnabled = false;
//			text.text = "Cursor keys / WSAD - move\n";
//			text.appendText("SHIFT - hold down to run\n");
//			text.appendText("numbers 1-9 - Attack\n");
//			text.filters = [new DropShadowFilter(1, 45, 0x0, 1, 0, 0)];
//
//			addChild(text);
//		}

		/**
		 * Initialise the lights
		 */
		private initLights():void
		{
			//create a light for shadows that mimics the sun's position in the skybox
            this.redLight = new PointLight();
            this.redLight.x = -1000;
            this.redLight.y = 200;
            this.redLight.z = -1400;
            this.redLight.color = 0xff1111;
            this.scene.addChild(this.redLight);

            this.blueLight = new PointLight();
            this.blueLight.x = 1000;
            this.blueLight.y = 200;
            this.blueLight.z = 1400;
            this.blueLight.color = 0x1111ff;
            this.scene.addChild(this.blueLight);

            this.whiteLight = new DirectionalLight(-50, -20, 10);
            this.whiteLight.color = 0xffffee;
            this.whiteLight.castsShadows = true;
            this.whiteLight.ambient = 1;
            this.whiteLight.ambientColor = 0x303040;
            this.whiteLight.shadowMapper = new NearDirectionalShadowMapper(.2);
            this.scene.addChild(this.whiteLight);

            this.lightPicker = new StaticLightPicker([this.redLight, this.blueLight, this.whiteLight]);


			//create a global shadow method
            this.shadowMapMethod = new NearShadowMapMethod(new SoftShadowMapMethod(this.whiteLight, 15, 8));
            this.shadowMapMethod.epsilon = .1;

			//create a global fog method
            this.fogMethod = new FogMethod(0, this.camera.lens.far*0.5, 0x000000);
		}

		/**
		 * Initialise the materials
		 */
		private initMaterials():void
		{
			//red light material
            this.redLightMaterial = new TextureMaterial();
            this.redLightMaterial.alphaBlending = true;
            this.redLightMaterial.addMethod(this.fogMethod);

			//blue light material
            this.blueLightMaterial = new TextureMaterial();
            this.blueLightMaterial.alphaBlending = true;
            this.blueLightMaterial.addMethod(this.fogMethod);

			//ground material
            this.groundMaterial = new TextureMaterial();
            this.groundMaterial.smooth = true;
            this.groundMaterial.repeat = true;
            this.groundMaterial.lightPicker = this.lightPicker;
            this.groundMaterial.shadowMethod = this.shadowMapMethod;
            this.groundMaterial.addMethod(this.fogMethod);

			//body material
            this.bodyMaterial = new TextureMaterial();
            this.bodyMaterial.gloss = 20;
            this.bodyMaterial.specular = 1.5;
            this.bodyMaterial.addMethod(this.fogMethod);
            this.bodyMaterial.lightPicker = this.lightPicker;
            this.bodyMaterial.shadowMethod = this.shadowMapMethod;

            //gob material
            this.gobMaterial = new TextureMaterial();
            this.gobMaterial.alphaBlending = true;
            this.gobMaterial.smooth = true;
            this.gobMaterial.repeat = true;
            this.gobMaterial.animateUVs = true;
            this.gobMaterial.addMethod(this.fogMethod);
            this.gobMaterial.lightPicker = this.lightPicker;
            this.gobMaterial.shadowMethod = this.shadowMapMethod;
		}

		/**
		 * Initialise the scene objects
		 */
		private initObjects():void
		{
			//create light billboards
            var redSprite:Sprite3D = new Sprite3D(this.redLightMaterial, 200, 200);
            redSprite.castsShadows = false;
            var blueSprite:Sprite3D = new Sprite3D(this.blueLightMaterial, 200, 200);
            blueSprite.castsShadows = false;
            this.redLight.addChild(redSprite);
            this.blueLight.addChild(blueSprite);

			AssetLibrary.enableParser(MD5MeshParser);
			AssetLibrary.enableParser(MD5AnimParser);

			//create a rocky ground plane
            this.ground = new Mesh(new PlaneGeometry(50000, 50000, 1, 1), this.groundMaterial);
            this.ground.geometry.scaleUV(200, 200);
            this.ground.castsShadows = false;
            this.scene.addChild(this.ground);
		}

		/**
		 * Initialise the listeners
		 */
		private initListeners():void
		{
            window.onresize  = (event) => this.onResize(event);
            document.onkeydown = (event) => this.onKeyDown(event);
            document.onkeyup = (event) => this.onKeyUp(event);

			this.onResize();

            this._timer = new away.utils.RequestAnimationFrame(this.onEnterFrame, this);
            this._timer.start();

            //setup the url map for textures in the cubemap file
            var assetLoaderContext:away.loaders.AssetLoaderContext = new away.loaders.AssetLoaderContext();
            assetLoaderContext.dependencyBaseUrl = "assets/skybox/";

            //load hellknight mesh
            AssetLibrary.addEventListener(AssetEvent.ASSET_COMPLETE, this.onAssetComplete, this);
            AssetLibrary.addEventListener(away.events.LoaderEvent.RESOURCE_COMPLETE, this.onResourceComplete, this);
            AssetLibrary.load(new URLRequest("assets/hellknight/hellknight.md5mesh"), null, null, new MD5MeshParser());

            //load environment texture
            AssetLibrary.load(new URLRequest("assets/skybox/grimnight_texture.cube"), assetLoaderContext);

            //load light textures
            AssetLibrary.load(new URLRequest("assets/redlight.png"));
            AssetLibrary.load(new URLRequest("assets/bluelight.png"));

            //load floor textures
            AssetLibrary.load(new URLRequest("assets/rockbase/rockbase_diffuse.jpg"));
            AssetLibrary.load(new URLRequest("assets/rockbase/rockbase_normals.png"));
            AssetLibrary.load(new URLRequest("assets/rockbase/rockbase_specular.png"));

            //load hellknight textures
            AssetLibrary.load(new URLRequest("assets/hellknight/hellknight_diffuse.jpg"));
            AssetLibrary.load(new URLRequest("assets/hellknight/hellknight_normals.png"));
            AssetLibrary.load(new URLRequest("assets/hellknight/hellknight_specular.png"));
            AssetLibrary.load(new URLRequest("assets/hellknight/gob.png"));
		}

		/**
		 * Navigation and render loop
		 */
		private onEnterFrame(dt:number):void
		{
            this._time += dt;

            this.cameraController.update();

			//update character animation
			if (this.mesh) {
                this.mesh.subMeshes[1].offsetV = this.mesh.subMeshes[2].offsetV = this.mesh.subMeshes[3].offsetV = (-this._time/2000 % 1);
                this.mesh.rotationY += this.currentRotationInc;
            }

            this.count += 0.01;

            this.redLight.x = Math.sin(this.count)*1500;
            this.redLight.y = 250 + Math.sin(this.count*0.54)*200;
            this.redLight.z = Math.cos(this.count*0.7)*1500;
            this.blueLight.x = -Math.sin(this.count*0.8)*1500;
            this.blueLight.y = 250 - Math.sin(this.count*.65)*200;
            this.blueLight.z = -Math.cos(this.count*0.9)*1500;

            this.view.render();
		}

		/**
		 * Listener for asset complete event on loader
		 */
		private onAssetComplete(event:AssetEvent):void
		{
			if (event.asset.assetType == AssetType.ANIMATION_NODE) {

				var node:SkeletonClipNode = <SkeletonClipNode> event.asset;
				var name:string = event.asset.assetNamespace;

				node.name = name;
                this.animationSet.addAnimation(node);

				if (name == Intermediate_MD5Animation.IDLE_NAME || name == Intermediate_MD5Animation.WALK_NAME) {
					node.looping = true;
				} else {
					node.looping = false;
					node.addEventListener(AnimationStateEvent.PLAYBACK_COMPLETE, this.onPlaybackComplete, this);
				}

				if (name == Intermediate_MD5Animation.IDLE_NAME)
                    this.stop();
			} else if (event.asset.assetType == AssetType.ANIMATION_SET) {
                this.animationSet = <SkeletonAnimationSet> event.asset;
                this.animator = new SkeletonAnimator(this.animationSet, this.skeleton);
				for (var i:number /*uint*/ = 0; i < Intermediate_MD5Animation.ANIM_NAMES.length; ++i)
					AssetLibrary.load(new URLRequest("assets/hellknight/" + Intermediate_MD5Animation.ANIM_NAMES[i] + ".md5anim"), null, Intermediate_MD5Animation.ANIM_NAMES[i], new MD5AnimParser());

                this.mesh.animator = this.animator;
			} else if (event.asset.assetType == AssetType.SKELETON) {
                this.skeleton = <Skeleton> event.asset;
			} else if (event.asset.assetType == AssetType.MESH) {
				//grab mesh object and assign our material object
                this.mesh = <Mesh> event.asset;
                this.mesh.subMeshes[0].material = this.bodyMaterial;
                this.mesh.subMeshes[1].material = this.mesh.subMeshes[2].material = this.mesh.subMeshes[3].material = this.gobMaterial;
                this.mesh.castsShadows = true;
                this.mesh.rotationY = 180;
                this.scene.addChild(this.mesh);

				//add our lookat object to the mesh
                this.mesh.addChild(this.placeHolder);
			}
		}

        /**
         * Listener function for resource complete event on asset library
         */
        private onResourceComplete (event:LoaderEvent)
        {
            switch( event.url )
            {
                //environment texture
                case 'assets/skybox/grimnight_texture.cube':
                    this.cubeTexture = <HTMLImageElementCubeTexture> event.assets[ 0 ];

                    this.skyBox = new SkyBox(this.cubeTexture);
                    this.scene.addChild(this.skyBox);
                    break;

                //lights textures
                case "assets/redlight.png" :
                    this.redLightMaterial.texture = <HTMLImageElementTexture> event.assets[ 0 ];
                    break;
                case "assets/bluelight.png" :
                    this.blueLightMaterial.texture = <HTMLImageElementTexture> event.assets[ 0 ];
                    break;

                //floor textures
                case "assets/rockbase/rockbase_diffuse.jpg" :
                    this.groundMaterial.texture = <HTMLImageElementTexture> event.assets[ 0 ];
                    break;
                case "assets/rockbase/rockbase_normals.png" :
                    this.groundMaterial.normalMap = <HTMLImageElementTexture> event.assets[ 0 ];
                    break;
                case "assets/rockbase/rockbase_specular.png" :
                    this.groundMaterial.specularMap = <HTMLImageElementTexture> event.assets[ 0 ];
                    break;

                //hellknight textures
                case "assets/hellknight/hellknight_diffuse.jpg" :
                    this.bodyMaterial.texture = <HTMLImageElementTexture> event.assets[ 0 ];
                    break;
                case "assets/hellknight/hellknight_normals.png" :
                    this.bodyMaterial.normalMap = <HTMLImageElementTexture> event.assets[ 0 ];
                    break;
                case "assets/hellknight/hellknight_specular.png" :
                    this.bodyMaterial.specularMap = <HTMLImageElementTexture> event.assets[ 0 ];
                    break;
                case "assets/hellknight/gob.png" :
                    this.bodyMaterial.specularMap = this.gobMaterial.texture = <HTMLImageElementTexture> event.assets[ 0 ];
                    break;
            }
        }

		private onPlaybackComplete(event:AnimationStateEvent):void
		{
			if (this.animator.activeState != event.animationState)
				return;

            this.onceAnim = null;

            this.animator.play(this.currentAnim, this.stateTransition);
            this.animator.playbackSpeed = this.isMoving? this.movementDirection*(this.isRunning? Intermediate_MD5Animation.RUN_SPEED : Intermediate_MD5Animation.WALK_SPEED) : Intermediate_MD5Animation.IDLE_SPEED;
		}

		private playAction(val:number /*uint*/):void
		{
            this.onceAnim = Intermediate_MD5Animation.ANIM_NAMES[val + 2];
            this.animator.playbackSpeed = Intermediate_MD5Animation.ACTION_SPEED;
            this.animator.play(this.onceAnim, this.stateTransition, 0);
		}

        /**
         * Key up listener
         */
        private onKeyDown(event):void
        {
            switch (event.keyCode) {
                case Keyboard.SHIFT:
                    this.isRunning = true;
                    if (this.isMoving)
                        this.updateMovement(this.movementDirection);
                    break;
                case Keyboard.UP:
                case Keyboard.W:
                case Keyboard.Z: //fr
                    this.updateMovement(this.movementDirection = 1);
                    break;
                case Keyboard.DOWN:
                case Keyboard.S:
                    this.updateMovement(this.movementDirection = -1);
                    break;
                case Keyboard.LEFT:
                case Keyboard.A:
                case Keyboard.Q: //fr
                    this.currentRotationInc = -Intermediate_MD5Animation.ROTATION_SPEED;
                    break;
                case Keyboard.RIGHT:
                case Keyboard.D:
                    this.currentRotationInc = Intermediate_MD5Animation.ROTATION_SPEED;
                    break;
            }
        }

        /**
         * Key down listener for animation
         */
        private onKeyUp(event):void
        {
            switch (event.keyCode) {
                case Keyboard.SHIFT:
                    this.isRunning = false;
                    if (this.isMoving)
                        this.updateMovement(this.movementDirection);
                    break;
                case Keyboard.UP:
                case Keyboard.W:
                case Keyboard.Z: //fr
                case Keyboard.DOWN:
                case Keyboard.S:
                    this.stop();
                    break;
                case Keyboard.LEFT:
                case Keyboard.A:
                case Keyboard.Q: //fr
                case Keyboard.RIGHT:
                case Keyboard.D:
                    this.currentRotationInc = 0;
                    break;
                case Keyboard.NUMBER_1:
					this.playAction(1);
					break;
                case Keyboard.NUMBER_2:
                    this.playAction(2);
					break;
                case Keyboard.NUMBER_3:
                    this.playAction(3);
					break;
                case Keyboard.NUMBER_4:
                    this.playAction(4);
					break;
                case Keyboard.NUMBER_5:
                    this.playAction(5);
					break;
                case Keyboard.NUMBER_6:
                    this.playAction(6);
					break;
                case Keyboard.NUMBER_7:
                    this.playAction(7);
					break;
                case Keyboard.NUMBER_8:
                    this.playAction(8);
					break;
                case Keyboard.NUMBER_9:
                    this.playAction(9);
					break;
            }
        }

		private updateMovement(dir:number):void
		{
			this.isMoving = true;
            this.animator.playbackSpeed = dir*(this.isRunning? Intermediate_MD5Animation.RUN_SPEED : Intermediate_MD5Animation.WALK_SPEED);

			if (this.currentAnim == Intermediate_MD5Animation.WALK_NAME)
				return;

            this.currentAnim = Intermediate_MD5Animation.WALK_NAME;

			if (this.onceAnim)
				return;

			//update animator
            this.animator.play(this.currentAnim, this.stateTransition);
		}

		private stop():void
		{
            this.isMoving = false;

			if (this.currentAnim == Intermediate_MD5Animation.IDLE_NAME)
				return;

            this.currentAnim = Intermediate_MD5Animation.IDLE_NAME;

			if (this.onceAnim)
				return;

			//update animator
            this.animator.playbackSpeed = Intermediate_MD5Animation.IDLE_SPEED;
            this.animator.play(this.currentAnim, this.stateTransition);
		}

		/**
		 * stage listener for resize events
		 */
		private onResize(event:Event = null):void
		{
            this.view.width     = window.innerWidth;
            this.view.height    = window.innerHeight;
		}
	}
}
