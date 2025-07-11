# Generated by Django 5.2.1 on 2025-05-27 23:44

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('media_files', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Transcription',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('completed_date', models.DateTimeField(auto_now_add=True)),
                ('vtt_file_path', models.CharField(blank=True, max_length=512, null=True)),
                ('srt_file_path', models.CharField(blank=True, max_length=512, null=True)),
                ('txt_file_path', models.CharField(blank=True, max_length=512, null=True)),
                ('raw_whisperx_output_path', models.CharField(blank=True, help_text='Path to stored JSON response if too large for DB field', max_length=512, null=True)),
                ('raw_whisperx_output', models.JSONField(blank=True, help_text='Raw JSON response from WhisperX API', null=True)),
                ('word_count', models.IntegerField(blank=True, null=True)),
                ('segment_count', models.IntegerField(blank=True, null=True)),
                ('speaker_count', models.IntegerField(blank=True, null=True)),
                ('media_file', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='transcription', to='media_files.mediafile')),
            ],
            options={
                'indexes': [models.Index(fields=['media_file'], name='transcripti_media_f_22aa3f_idx'), models.Index(fields=['-completed_date'], name='transcripti_complet_d1c843_idx')],
            },
        ),
    ]
