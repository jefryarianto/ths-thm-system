import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:video_player/video_player.dart';

import '../../logic/auth/auth_bloc.dart';

/// Splash video sebelum login — memutar `assets/videos/videothsnew.mp4`
/// (file `videothsnew.mp4` dari root repo, 682 KB, offline).
///
/// Flow: user terautentikasi → langsung `/home` (tanpa menunggu video).
/// User belum login → video diputar penuh (tanpa skip) sampai selesai,
/// lalu arahkan ke `/login`. Timer pengaman 8s sebagai cadangan bila
/// video gagal menandai selesai.
class VideoSplashScreen extends StatefulWidget {
  const VideoSplashScreen({super.key});

  @override
  State<VideoSplashScreen> createState() => _VideoSplashplashState();
}

class _VideoSplashplashState extends State<VideoSplashScreen> {
  late final VideoPlayerController _controller;
  bool _videoReady = false;
  bool _videoFailed = false;
  bool _videoDone = false;
  bool _navigated = false;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.asset('assets/videos/videothsnew.mp4')
      ..initialize().then((_) {
        if (!mounted) return;
        setState(() => _videoReady = true);
        _controller.play();
        _controller.setLooping(false);
        _controller.addListener(_onVideoTick);
      })
      ..addListener(() {
        if (_controller.value.hasError && !_videoFailed) {
          if (!mounted) return;
          setState(() => _videoFailed = true);
          _videoDone = true;
          _tryNavigate();
        }
      });
    // Pengaman: lanjutkan meski video tak pernah menandai selesai.
    Future.delayed(const Duration(seconds: 8), () {
      if (mounted && !_navigated) {
        _videoDone = true;
        _tryNavigate();
      }
    });
  }

  void _onVideoTick() {
    if (_videoDone) return;
    final position = _controller.value.position;
    final duration = _controller.value.duration;
    if (position >= duration) {
      _videoDone = true;
      _tryNavigate();
    }
  }

  void _tryNavigate() {
    if (_navigated || !_videoDone) return;
    final state = context.read<AuthBloc>().state;
    if (state is AuthUnauthenticated) {
      _navigated = true;
      context.go('/login');
    } else if (state is AuthAuthenticated) {
      _navigated = true;
      context.go('/home');
    }
    // AuthInitial / AuthLoading → stay, tunggu BlocListener berikutnya
  }

  @override
  void dispose() {
    _controller.removeListener(_onVideoTick);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthAuthenticated && !_navigated) {
          _navigated = true;
          context.go('/home');
        } else if (state is AuthUnauthenticated && !_navigated) {
          // Tunggu video selesai sebelum pindah ke login.
          _tryNavigate();
        }
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          fit: StackFit.expand,
          children: [
            if (_videoReady && !_videoFailed && !_navigated)
              Center(
                child: AspectRatio(
                  aspectRatio: _controller.value.aspectRatio,
                  child: VideoPlayer(_controller),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
